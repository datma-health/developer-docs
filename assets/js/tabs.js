document.addEventListener('DOMContentLoaded', function () {
  var blocks = Array.from(
    document.querySelectorAll('.language-json.highlighter-rouge, .language-python.highlighter-rouge')
  );

  var i = 0;
  while (i < blocks.length) {
    var block = blocks[i];

    if (block.classList.contains('language-json')) {
      // Walk DOM siblings to find the immediately next element sibling
      var next = block.nextElementSibling;

      if (
        next &&
        next.classList.contains('language-python') &&
        next.classList.contains('highlighter-rouge')
      ) {
        wrapInTabs(block, next);
        i += 2;
        continue;
      }
    }

    i++;
  }

  function wrapInTabs(jsonBlock, pythonBlock) {
    var wrapper = document.createElement('div');
    wrapper.className = 'code-tabs';

    var buttons = document.createElement('div');
    buttons.className = 'tab-buttons';

    var jsonBtn = makeButton('JSON', 'json', true);
    var pyBtn = makeButton('Python', 'python', false);
    buttons.appendChild(jsonBtn);
    buttons.appendChild(pyBtn);

    var jsonPane = document.createElement('div');
    jsonPane.className = 'tab-pane active';
    jsonPane.dataset.lang = 'json';

    var pyPane = document.createElement('div');
    pyPane.className = 'tab-pane';
    pyPane.dataset.lang = 'python';

    jsonBlock.parentNode.insertBefore(wrapper, jsonBlock);
    jsonPane.appendChild(jsonBlock);
    pyPane.appendChild(pythonBlock);

    wrapper.appendChild(buttons);
    wrapper.appendChild(jsonPane);
    wrapper.appendChild(pyPane);

    buttons.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      var lang = btn.dataset.lang;

      buttons.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.lang === lang);
      });
      wrapper.querySelectorAll('.tab-pane').forEach(function (p) {
        p.classList.toggle('active', p.dataset.lang === lang);
      });
    });
  }

  function makeButton(label, lang, active) {
    var btn = document.createElement('button');
    btn.className = 'tab-btn' + (active ? ' active' : '');
    btn.dataset.lang = lang;
    btn.textContent = label;
    return btn;
  }
});
