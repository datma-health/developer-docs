# Cohort Analysis API Reference

Schema version: `0.1.0`.

- [Cohort Request](#cohort-request)
- [Feature Request](#feature-request)
- [Feature Vector to DataFrame Workflow](#feature-vector-to-dataframe-workflow)
- [Feature Vector Output Schema](#feature-vector-output-schema)
- [Filter Options with Examples](#filter-options-with-examples)
- [Comparison Operators with Examples](#comparison-operators-with-examples)
- [Composition Examples (AND / OR)](#composition-examples-and-or)

## Cohort Request

Use a `CohortQueryRequest` to define and execute a cohort.

Required fields:

- `name` (string)
- `schemaVersion` (string): `0.1.0`
- `query` (`CriteriaFilter` or `CohortQuery`)

Optional fields:

- `cohortQueryXid` (string): can be provided if you are saving and want to update the value associated with an existing xid.

Important note on saving cohorts:

- If you plan to request feature vectors by `cohortQueryResponseXid`, run `create_cohort(..., save=True)` so the cohort response can be referenced.
- Saving is a background job. If you need to confirm that your cohort is created, use the get cohort functionality to retrieve details for your cohort XID.
- If you do not save the cohort, you can still request feature vectors by passing `patientIds` directly for a reasonable request size.

```json
{
  "name": "Adults with hypertension",
  "schemaVersion": "0.1.0",
  "query": {
    "filterType": "Order",
    "criteriaFilter": {
      "orderTypeOption": "Condition",
      "orderConcept": {
        "codeType": "ICD10-CM",
        "conceptCode": {
          "op": "starts_with",
          "value": "I10"
        }
      }
    }
  }
}
```

```python
# `create_cohort(...)` accepts either a typed `CohortQueryRequest` or a plain dict JSON payload.
from odasdk import cohort
from odasdk.models.cohort import *

cohort_request = CohortQueryRequest(
    name="Adults with hypertension",
    schemaVersion="0.1.0",
    query=CriteriaFilter(
        filterType=FilterType.Order,
        criteriaFilter=OrderFilter(
            orderTypeOption=OrderTypeOption.Condition,
            orderConcept=ConceptFilter(
                codeType="ICD10-CM",
                conceptCode=ComparisonStringValue(
                    op=StringComparator.starts_with,
                    value="I10",
                ),
            ),
        ),
    ),
)

# save=True if you want to use cohortQueryResponseXid for feature requests
# include_ids=True if you want to use patientIds
cohort_response = cohort.create_cohort(cohort_request, include_ids=False, save=False)

# Option: pass the same request as a plain dict (JSON payload) directly.
cohort_request_dict = {
  "name": "Adults with hypertension",
  "schemaVersion": "0.1.0",
  "query": {
    "filterType": "Order",
    "criteriaFilter": {
      "orderTypeOption": "Condition",
      "orderConcept": {
        "codeType": "ICD10-CM",
        "conceptCode": {
          "op": "starts_with",
          "value": "I10",
        },
      },
    },
  },
}

cohort_response_from_dict = cohort.create_cohort(
  cohort_request_dict,
  include_ids=False,
  save=False,
)
```

Typical response fields you will use next:

```json
{
  "patientTotal": 147,
  "cohortQueryXid": "cq_123",
  "cohortQueryResponseXid": "cqr_456",
  "patientIds": ["patient_001", "patient_002"]
}
```

When `include_ids` is false, `patientIds` field will be omitted from response. When `save` is false, `cohortQuery*Xid` fields will not be saved.

### Check saved cohort details by XID

Use the saved `cohortQueryResponseXid` to fetch cohort details, if needed. This is informational only, in general, this is not needed for an analysis flow.

```python
from odasdk import cohort

saved_xid = cohort_response.get("cohortQueryResponseXid")

# include_ids=True returns patientIds, if required
cohort_details = cohort.get_cohort(xid=saved_xid, include_ids=False)
print(cohort_details)
```

## Feature Request

Feature requests should include one or more `CriteriaFilter` items in `features`.
Below is a single-feature request body.

You can identify patients in two ways:

1. By `cohortQueryResponseXid` from a saved cohort response.
2. By explicit `patientIds`.

### Option A: use `cohortQueryResponseXid` (saved cohort)

```json
{
  "cohortQueryResponseXid": "cqr_456",
  "features": [
    {
      "filterType": "Observation",
      "criteriaFilter": {
        "observationConcept": {
          "codeType": "LOINC",
          "conceptCode": {
            "op": "eq",
            "value": "4548-4"
          }
        }
      }
    }
  ]
}
```

```python
from odasdk import cohort

# Same payload as Option A JSON, passed directly as a Python dict.
feature_request_by_xid = {
  "cohortQueryResponseXid": "cqr_456",
  "features": [
    {
      "filterType": "Observation",
      "criteriaFilter": {
        "observationConcept": {
          "codeType": "LOINC",
          "conceptCode": {
            "op": "eq",
            "value": "4548-4",
          },
        }
      },
    }
  ],
}

feature_response_by_xid = cohort.create_feature_vectors(feature_request_by_xid)
```

### Option B: use `patientIds`

```json
{
  "patientIds": ["patient_001", "patient_002"],
  "features": [
    {
      "filterType": "Observation",
      "criteriaFilter": {
        "observationConcept": {
          "codeType": "LOINC",
          "conceptCode": {
            "op": "eq",
            "value": "4548-4"
          }
        }
      }
    }
  ]
}
```

```python
from odasdk import cohort
from odasdk.models.cohort import *
from odasdk.models.features import FeatureVectorsRequest

single_feature = CriteriaFilter(
    filterType=FilterType.Observation,
    criteriaFilter=ObservationFilter(
        observationConcept=ConceptFilter(
            codeType="LOINC",
            conceptCode=ComparisonStringValue(
                op=StringComparator.eq,
                value="4548-4",
            ),
        )
    ),
)

feature_request = FeatureVectorsRequest(
    cohortQueryResponseXid="cqr_456",  # or pass patientIds=[...]
    features=[single_feature]
)

feature_response = cohort.create_feature_vectors(feature_request)
```

## Feature Vector to DataFrame Workflow

Recommended workflow:

1. Create cohort.
2. Build feature request from `cohortQueryResponseXid` or `patientIds`.
3. Convert each `featureVectors[*].featureValues` to a DataFrame.
4. Concatenate and aggregate.

```python
import pandas as pd
from odasdk import cohort

# Use SDK utility: odasdk.cohort.get_feature_vector_dataframe
# It handles pagination internally for a single-feature request body.
# In general, explicit pagination tuning may not be needed.
# For larger result sets, you can pass pagination options (example below).
combined = cohort.get_feature_vector_dataframe(feature_request)

# Optional pagination tuning for large datasets:
# combined = cohort.get_feature_vector_dataframe(
#         feature_request,
#         page_size=100000,
#     )

code_counts = (
    combined.groupby("code")
    .size()
    .reset_index(name="result_count")
    .sort_values("result_count", ascending=False)
)
print(code_counts.head(10).to_string(index=False))
```

Example notebook output:

```text
   code  result_count
 4548-4          1284
 1988-5           934
 1751-7           612
14647-2           402
 2324-2           276
```

## Feature Vector Output Schema

Each item in `featureVectors` includes:

- `featureFilterOrigin`: the filter that produced this vector.
- `featureSchema`: a map of output column name to type (for example `"id": "str"`, `"dateStart": "datetime"`).
- `featureValues`: the row data for that feature.
- `nextPageCursor` (optional): pagination cursor for deep paging on `Observation`, `Medication`, `Procedure`, and `Condition` vectors (`filterType: Order`).

This means your DataFrame schema should come from `featureSchema`, not from assumptions.

```python
import pandas as pd

feature_vector = feature_response["featureVectors"][0]
schema = feature_vector["featureSchema"]
rows = feature_vector["featureValues"]

df = pd.DataFrame.from_records(rows)
print("schema:", schema)
print(df.head(3))
```

Native output schema details are provided in the next section.


## Filter Options with Examples

All supported `filterType` values are listed below with a minimal example.

### Demographic

Use `demographicTypeOption` to choose which demographic attribute to filter:

- `Age`: use numeric comparisons in `demographicValue` (for example `gte 18`).
- `Gender` (or `Sex`, depending on source mapping): use string comparisons.
- `Race`: use string or array comparisons.
- `VitalStatus`: use values like alive/deceased (source-dependent).
- `All`: returns the full demographic vector (`age`, `sex`, `race`, `mortality`) for each patient, but is not valid for cohort request (ie. return all patients).

```json
{
  "filterType": "Demographic",
  "criteriaFilter": {
    "demographicTypeOption": "Age",
    "demographicValue": {
      "op": "gte",
      "value": 18
    }
  }
}
```

Output schema (`Age`, `Race`, `Gender`, `VitalStatus`):

| column | type |
| --- | --- |
| `id` | `str` |
| `value` | `str` |

Output schema (`All`):

| column | type |
| --- | --- |
| `id` | `str` |
| `age` | `str` |
| `sex` | `str` |
| `race` | `str` |
| `mortality` | `str` |

### Medication

Use `Medication` to filter by medication concepts.

- For string searching on medication names/descriptions, omit `codeType`.
- Add `codeType` only when you want entries confirmed to map to a specific coding system (for example `RxNorm` or `RxBrand`).
- In general, it is recommended to omit `codeType` for medication queries, then inspect returned values in your DataFrame and refine from there.

```json
{
  "filterType": "Order",
  "criteriaFilter": {
    "orderTypeOption": "Medication",
    "orderConcept": {
      "conceptDescription": {
        "op": "contains",
        "value": "metformin"
      }
    }
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `encounterId` | `str` |
| `conceptAttribute` | `str` |
| `conceptCode` | `str` |
| `conceptDescription` | `str` |
| `dateStart` | `datetime` |
| `dateStop` | `datetime` |
| `route` | `str` |
| `takenTime` | `datetime` |
| `administrationAction` | `str` |
| `administrationReason` | `str` |

### Procedure

Use `Procedure` to filter procedure concepts.

- For broad string matching on procedure names/descriptions, omit `codeType`.
- Add `codeType` (for example `ICD10-PCS`) when you want to filter to entries confirmed to map to that coding system.
- In practice, you can start without `codeType` to explore values, then tighten to exact coded matches.

```json
{
  "filterType": "Order",
  "criteriaFilter": {
    "orderTypeOption": "Procedure",
    "orderConcept": {
      "conceptDescription": {
        "op": "contains",
        "value": "biopsy"
      }
    }
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `encounterId` | `str` |
| `conceptAttribute` | `str` |
| `conceptCode` | `str` |
| `conceptDescription` | `str` |
| `dateStart` | `datetime` |
| `dateStop` | `datetime` |

### Condition

Use `Condition` to filter diagnosis concepts.

- In most cases, condition codes are returned as `ICD10-CM`.
- You can specify `codeType: "ICD10-CM"` in the request for clarity and explicit matching.
- Condition codes are normalized with `.` removed (for example `I10.9` is treated as `I109`).

```json
{
  "filterType": "Order",
  "criteriaFilter": {
    "orderTypeOption": "Condition",
    "orderConcept": {
      "codeType": "ICD10-CM",
      "conceptCode": {
        "op": "starts_with",
        "value": "I10"
      }
    }
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `encounterId` | `str` |
| `conceptAttribute` | `str` |
| `conceptCode` | `str` |
| `conceptDescription` | `str` |
| `dateStart` | `datetime` |
| `dateStop` | `datetime` |

### Observation

Use description-based observation matching.

- Omit `codeType` and search with `conceptDescription`.
- Use `op: "in"` on `conceptDescription` to query multiple descriptions at once.
- Add `observationBounds` when you need to isolate specific result ranges (for example, only high or only low values).
- Wildcard behavior: `contains` is translated to `%value%`, `starts_with` to `value%`, and `ends_with` to `%value` (case-insensitive matching).
- If you include `%` in your input value, it is passed through and treated as a SQL wildcard pattern.

```json
{
  "filterType": "Observation",
  "criteriaFilter": {
    "observationConcept": {
      "conceptDescription": {
        "op": "in",
        "value": [
          "wbc",
          "rbc",
          "% blood count"
        ]
      }
    }
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `encounterId` | `str` |
| `conceptCode` | `str` |
| `conceptDescription` | `str` |
| `dateStart` | `datetime` |
| `value` | `str` |
| `valueText` | `str` |
| `valueNumeric` | `f64` |
| `valueHigh` | `f64` |
| `valueLow` | `f64` |
| `interpretation` | `str` |

### Encounter

Use `Encounter` to filter encounter-level metadata.

- Common fields include `encounterType`, `encounterId`, `startDate`, and `endDate`.
- Use `encounterType` with `op: "in"` to focus on settings such as inpatient, emergency, or outpatient.

```json
{
  "filterType": "Encounter",
  "criteriaFilter": {
    "encounterType": {
      "op": "in",
      "value": ["Inpatient", "Emergency"]
    }
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `encounterId` | `str` |
| `dateStart` | `datetime` |
| `dateStop` | `datetime` |
| `encounterType` | `str` |

### Interval

Use `Interval` to express temporal logic across events.

- Put each event filter under `events` and optionally set `orderOfOccurrence` (for example `First`).
- Use `durationBounds` to constrain how far apart events can occur (for example within 90 days).
- Interval queries are for cohort selection only and are not supported in the feature vector endpoint.

```json
{
  "filterType": "Interval",
  "criteriaFilter": {
    "events": [
      {
        "criteriaFilter": {
          "filterType": "Order",
          "criteriaFilter": {
            "orderTypeOption": "Condition",
            "orderConcept": {
              "conceptCode": {
                "op": "starts_with",
                "value": "I21"
              }
            }
          }
        },
        "orderOfOccurrence": "First"
      },
      {
        "criteriaFilter": {
          "filterType": "Order",
          "criteriaFilter": {
            "orderTypeOption": "Medication",
            "orderConcept": {
              "conceptDescription": {
                "op": "contains",
                "value": "statin"
              }
            }
          }
        }
      }
    ],
    "durationBounds": [
      {
        "op": "lte",
        "value": 90
      }
    ]
  }
}
```

### Genomic

Use `Genomic` for variant/gene-level filters.

- `genomicTypeOption` selects what genomic field you are matching (for example `Gene`).
- `genomicValue` is the value to match (for example `TP53`).

```json
{
  "filterType": "Genomic",
  "criteriaFilter": {
    "genomicTypeOption": "Gene",
    "genomicValue": "TP53"
  }
}
```

Output schema:

| column | type |
| --- | --- |
| `id` | `str` |
| `altAllele` | `str` |
| `refAllele` | `str` |
| `genotype` | `str` |
| `contig` | `str` |
| `start` | `number` |
| `date` | `str` |
| `DP` | `any` |
| `VAF` | `any` |
| `VP` | `any` |

## Comparison Operators with Examples

### Numeric (`ComparisonIntValue` / `ComparisonFloatValue`)

Use a small set of numeric operators for most boundary queries: `gte`, `lte`, `gt`, `lt`.

`between` style queries are represented as a list of two bounds.

```json
[
    { "op": "gte", "value": 10 },
    { "op": "lte", "value": 86 }
]
```

Single-sided boundary examples:

```json
{ "op": "gt", "value": 6.5 }
```

### String (`ComparisonStringValue`)

For string matching, the most common operators are `eq`, `contains`, and `starts_with`.

```json
{ "op": "eq", "value": "Female" }

{ "op": "contains", "value": "hypertension" }
  
{ "op": "starts_with", "value": "I10" }
```

### Array (`ComparisonArrayValue`)

Use `in` to match any value in a list.

```json
{ "op": "in", "value": ["%endo%", "endoscopy", "%scope] }

{ "op": "in", "value": ["I10", "E11%", "J44"] }
```

## Composition Examples (AND / OR)

Use `CohortQuery` when you want to combine multiple filters.

- `AND`: patient must match both sides
- `OR`: patient can match either side

### AND example

```json
{
  "name": "Adults with diabetes and hypertension",
  "schemaVersion": "0.1.0",
  "query": {
    "op": "AND",
    "lhs": {
      "filterType": "Order",
      "criteriaFilter": {
        "orderTypeOption": "Condition",
        "orderConcept": {
          "conceptCode": {
            "op": "starts_with",
            "value": "E11"
          }
        }
      }
    },
    "rhs": {
      "filterType": "Order",
      "criteriaFilter": {
        "orderTypeOption": "Condition",
        "orderConcept": {
          "conceptCode": {
            "op": "starts_with",
            "value": "I10"
          }
        }
      }
    }
  }
}
```

### OR example

```json
{
  "name": "Adults with diabetes or hypertension",
  "schemaVersion": "0.1.0",
  "query": {
    "op": "OR",
    "lhs": {
      "filterType": "Order",
      "criteriaFilter": {
        "orderTypeOption": "Condition",
        "orderConcept": {
          "conceptCode": {
            "op": "starts_with",
            "value": "E11"
          }
        }
      }
    },
    "rhs": {
      "filterType": "Order",
      "criteriaFilter": {
        "orderTypeOption": "Condition",
        "orderConcept": {
          "conceptCode": {
            "op": "starts_with",
            "value": "I10"
          }
        }
      }
    }
  }
}
```
