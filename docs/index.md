---
layout: default
title: Definitions
permalink: /
---

# Definitions

{% include docs-nav.html %}

This page centralizes terms used across the documentation.

## Core terms

| Term | Definition |
| --- | --- |
| datma.FED | A federated network consisting of Nodes and a central Hub. |
| Data Custodian Nodes | Deployed within entities who are custodians of health care data, e.g. Health Systems, Labs, Registries. |
| Data Consumer Nodes | Deployed within entities who want to gain privacy-preserved access to health care data, e.g. Pharma companies, Medical Devices, Contract Research Organizations, etc. |
| Cohort | A patient group matching a query. |
| CohortQueryRequest | Payload used to build or update a cohort. |
| CohortQueryResponseXid | Identifier for a saved cohort response, used in later feature requests. |
| CriteriaFilter | Typed filter object used in cohort and feature queries. |
| FeatureVectorsRequest | Payload used to request feature vectors for patients or a saved cohort. |

## Comparison operators

| Operator | Meaning |
| --- | --- |
| `eq` | Equals |
| `neq` | Does not equal |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `starts_with` | String starts with value |


