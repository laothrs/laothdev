(function () {
  'use strict';

  /* --- DOM refs --- */
  var bootLog = document.getElementById('boot-log');
  var bootFooter = document.getElementById('boot-footer');
  var loginBanner = document.getElementById('login-banner');
  var cmdInput = document.getElementById('cmd-input');
  var bootScreen = document.getElementById('boot-screen');
  var mainTerminal = document.getElementById('main-terminal');
  var terminalOutput = document.getElementById('terminal-output');
  var mainInput = document.getElementById('main-input');

  /* --- typing speed (ms per character) --- */
  var SPEED_FAST = 4;
  var BOOT_TARGET_MS = 3600;
  var GAP_BOOT_LINE = 0;
  var HINT_DELAY_MS = 5000;

  var COMMANDS = [
    'clear', 'whoami', 'experience', 'skills', 'projects',
    'contact', 'email', 'dance', 'help', 'sudo'
  ];

  var BOOT_COMMANDS = ['start'];

  /* --- static content --- */
  var LAOTH_ART =
    ' _       ___  _____ _____ _   _ \n' +
    '| |     / _ \\|  _  |_   _| | | |\n' +
    '| |    / /_\\ \\ | | | | | | |_| |\n' +
    '| |    |  _  | | | | | | |  _  |\n' +
    '| |____| | | \\ \\_/ / | | | | | |\n' +
    '\\_____/\\_| |_|\\___/  \\_/ \\_| |_|';

  var WHOAMI_TEXT =
    'Software Developer, Data Science Specialist, and Cybersecurity enthusiast ' +
    'with a strong focus on backend architecture, penetration testing, and ' +
    'scalable cloud deployments.';

  var SKILLS_TREE =
    '~/skills\n' +
    '├── Languages & Frameworks: Python, C#, Laravel, JavaScript, Lua, Luau\n' +
    '├── Cybersecurity: Nmap, Metasploit, Reconnaissance, Penetration Testing\n' +
    '├── Systems & DevOps: Arch Linux, Fedora, Ubuntu, Oracle Cloud, Local LLM Integration (Ollama)\n' +
    '└── Tools & Environments: Cursor IDE, Ghostty, Antigravity IDE, Docker, Git';

  var PROJECTS_TABLE =
    '  PID  USER   STAT  ELAPSED  COMMAND\n' +
    ' 1001 laoth  Ss    00:42:10 [saas-platform] KrayinCRM-based system with technical service tracking and QR code integration.\n' +
    ' 1002 laoth  S     00:18:03 [browser-ext] Custom JavaScript-based filtering tool for the X platform.\n' +
    ' 1003 laoth  R+    00:06:55 [game-dev] A roblox game in development right now.\n' +
    ' 1004 laoth  Ss    01:12:44 [cloud-ai] Deployed and managed Ubuntu servers on Oracle Cloud running local LLMs via Ollama.';

  var EXPERIENCE_TEXT =
    '> Cybersecurity Specialist @ Solidea\n' +
    '> Data Science Specialist @ LAVEND X\n' +
    '> Developer @ Karakastech Savunma Sanayi AR-GE';

  var CONTACT_PLAIN =
    'github    -> github.com/laothrs\n' +
    'linkedin  -> linkedin.com/in/onur-akdoğan-54099831a/';

  var CONTACT_HTML =
    'github    -&gt; <a class="term-link" href="https://github.com/laothrs" target="_blank" rel="noopener noreferrer">github.com/laothrs</a>\n' +
    'linkedin  -&gt; <a class="term-link" href="https://linkedin.com/in/onur-akdo%C4%9Fan-54099831a/" target="_blank" rel="noopener noreferrer">linkedin.com/in/onur-akdoğan-54099831a/</a>';

  var EMAIL_PLAIN = 'email     -> onurakdo11@gmail.com';

  var EMAIL_HTML =
    'email     -&gt; <a class="term-link" href="mailto:onurakdo11@gmail.com">onurakdo11@gmail.com</a>';

  var HELP_TEXT =
    'Available commands:\n' +
    '  clear      Clear terminal output\n' +
    '  whoami     Display professional summary\n' +
    '  experience Display professional work history\n' +
    '  skills     List skills and technologies\n' +
    '  projects   Show recent operations\n' +
    '  contact    Display GitHub and LinkedIn links\n' +
    '  email      Display email address\n' +
    '  dance      Play ASCII dance video (Ctrl+C to exit)\n' +
    '  help       List available commands\n' +
    '  sudo       Restricted (permission denied)';

  /* trimmed boot log — ~3.6s total before login prompt */
  var bootLines = [
    { text: '  Booting the kernel.', cls: 'dim' },
    { text: '[    0.000000] Linux version 6.12.10-arch1-1 (linux@archlinux.org)', cls: 'dim' },
    { text: '[    0.000000] random: crng init done', cls: 'dim' },
    { text: '         Starting version 257.4-1-arch', cls: 'white' },
    { text: '[    OK  ] Reached target Paths.', cls: 'ok' },
    { text: '[    OK  ] Reached target Slices.', cls: 'ok' },
    { text: '         Starting Network Manager...', cls: 'white' },
    { text: '[    OK  ] Started Network Manager.', cls: 'ok' },
    { text: '[    OK  ] Started Getty on tty1.', cls: 'ok' },
    { text: '[    OK  ] Reached target Multi-User System.', cls: 'ok' },
    { text: '[    OK  ] Reached target Graphical Interface.', cls: 'ok' }
  ];

  GAP_BOOT_LINE = Math.floor(BOOT_TARGET_MS / bootLines.length);

  var lineIndex = 0;
  var promptReady = false;
  var portfolioReady = false;
  var isTyping = false;
  var danceActive = false;
  var danceBlock = null;
  var danceDone = null;
  var idleTimer = null;
  var hintEl = null;

  /* --- scroll helpers --- */
  function scrollOutput() {
    var body = document.querySelector('#main-terminal .terminal-body');
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  function scrollBoot() {
    var scroll = document.getElementById('boot-scroll');
    if (scroll) {
      scroll.scrollTop = scroll.scrollHeight;
    }
  }

  /* --- core typing: print text into an element char-by-char --- */
  function typeText(el, text, speed, done, onTick) {
    var i = 0;
    el.textContent = '';
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        if (onTick) onTick();
        setTimeout(tick, speed);
      } else if (done) {
        done();
      }
    }
    tick();
  }

  /* --- run callbacks in sequence --- */
  function runChain(steps, index) {
    if (index >= steps.length) return;
    steps[index](function () {
      runChain(steps, index + 1);
    });
  }

  /* --- idle hint (5s without keyboard activity) --- */
  function getHintMessage() {
    if (!bootScreen.classList.contains('hidden')) {
      if (promptReady) return "Hint: Type 'start' to begin";
      return '';
    }
    if (!mainTerminal.classList.contains('hidden') && portfolioReady) {
      return "Hint: Type 'help' to see available commands";
    }
    return '';
  }

  function hideHint() {
    if (hintEl) hintEl.classList.add('hidden');
  }

  function showHint() {
    var msg = getHintMessage();
    if (!msg || isTyping || danceActive) return;
    if (!hintEl) {
      hintEl = document.createElement('p');
      hintEl.id = 'terminal-hint';
      hintEl.className = 'terminal-hint hidden';
      document.body.appendChild(hintEl);
    }
    hintEl.textContent = msg;
    hintEl.classList.remove('hidden');
  }

  function resetIdleTimer() {
    hideHint();
    clearTimeout(idleTimer);
    var msg = getHintMessage();
    if (!msg) return;
    idleTimer = setTimeout(showHint, HINT_DELAY_MS);
  }

  function stopIdleTimer() {
    clearTimeout(idleTimer);
    hideHint();
  }

  /* --- TAB autocomplete (bash-style prefix match) --- */
  function longestCommonPrefix(list) {
    if (!list.length) return '';
    var prefix = list[0];
    for (var i = 1; i < list.length; i++) {
      while (list[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  }

  function tabComplete(input, commands) {
    var val = input.value;
    if (!val) return;
    var matches = commands.filter(function (cmd) {
      return cmd.indexOf(val) === 0;
    });
    if (matches.length === 1) {
      input.value = matches[0];
      return;
    }
    if (matches.length > 1) {
      var prefix = longestCommonPrefix(matches);
      if (prefix.length > val.length) {
        input.value = prefix;
      }
    }
  }

  /* --- focus the active prompt input (boot or portfolio) --- */
  function focusActiveInput() {
    if (!bootScreen.classList.contains('hidden')) {
      if (promptReady) cmdInput.focus();
      return;
    }
    if (!mainTerminal.classList.contains('hidden')) {
      mainInput.focus();
    }
  }

  /* --- portfolio output builders (return block + inner element) --- */
  function makeOutLine(cls) {
    var block = document.createElement('d' + 'iv');
    block.className = 'out-block';
    var line = document.createElement('p');
    line.className = 'out-line' + (cls ? ' ' + cls : '');
    block.appendChild(line);
    terminalOutput.appendChild(block);
    return { block: block, el: line };
  }

  function makeOutPre(cls) {
    var block = document.createElement('d' + 'iv');
    block.className = 'out-block';
    var pre = document.createElement('pre');
    pre.className = 'out-pre' + (cls ? ' ' + cls : '');
    block.appendChild(pre);
    terminalOutput.appendChild(block);
    return { block: block, el: pre };
  }

  function typeOutLine(text, cls, done) {
    var parts = makeOutLine(cls);
    typeText(parts.el, text, SPEED_FAST, function () {
      scrollOutput();
      if (done) done();
    }, scrollOutput);
  }

  function typeOutPre(text, cls, done) {
    var parts = makeOutPre(cls);
    typeText(parts.el, text, SPEED_FAST, function () {
      scrollOutput();
      if (done) done();
    }, scrollOutput);
  }

  /* --- append ready prompt after dance stops --- */
  function appendReadyPrompt(done) {
    var parts = makeOutLine('dim');
    parts.el.textContent = '[guest@archlinux ~]$ ';
    scrollOutput();
    if (done) done();
  }

  /* --- stop looping dance video (Ctrl+C) --- */
  function stopDance() {
    if (!danceActive) return;
    danceActive = false;

    if (danceBlock && danceBlock.parentNode) {
      var video = danceBlock.querySelector('video');
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      danceBlock.parentNode.removeChild(danceBlock);
    }
    danceBlock = null;

    var cb = danceDone;
    danceDone = null;

    typeOutLine('^C', 'dim', function () {
      appendReadyPrompt(cb);
    });
  }

  /* --- play dance.mp4 on loop until Ctrl+C --- */
  function playDance(done) {
    danceActive = true;
    danceDone = done;

    danceBlock = document.createElement('d' + 'iv');
    danceBlock.className = 'out-block';
    var video = document.createElement('video');
    video.className = 'easter-dance';
    video.src = 'dance.mp4';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    danceBlock.appendChild(video);
    terminalOutput.appendChild(danceBlock);
    scrollOutput();

    function fail(msg) {
      danceActive = false;
      danceBlock = null;
      danceDone = null;
      typeOutLine(msg, 'out-error', done);
    }

    video.addEventListener('error', function () {
      if (danceBlock && danceBlock.parentNode) {
        danceBlock.parentNode.removeChild(danceBlock);
      }
      fail('bash: dance: playback failed');
    });

    var playPromise = video.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        if (danceBlock && danceBlock.parentNode) {
          danceBlock.parentNode.removeChild(danceBlock);
        }
        fail('bash: dance: playback failed');
      });
    }
  }

  /* --- boot: flash one line (fast stream, no per-char typing) --- */
  function typeBootLine(line, done) {
    var span = document.createElement('span');
    span.className = line.cls || '';
    span.textContent = line.text + '\n';
    bootLog.appendChild(span);
    scrollBoot();
    setTimeout(done, GAP_BOOT_LINE);
  }

  function runBoot() {
    if (lineIndex >= bootLines.length) {
      showLogin();
      return;
    }
    var line = bootLines[lineIndex];
    lineIndex++;
    typeBootLine(line, runBoot);
  }

  /* --- boot login banner --- */
  function showLogin() {
    loginBanner.textContent = 'Arch Linux 2026.05.20 (tty1)\n';
    bootFooter.classList.remove('hidden');
    scrollBoot();
      setTimeout(function () {
        promptReady = true;
        focusActiveInput();
        resetIdleTimer();
      }, 150);
  }

  /* --- portfolio: LAOTH logo + name --- */
  function typeLaothLogo(done) {
    var block = document.createElement('d' + 'iv');
    block.className = 'out-block';
    var pre = document.createElement('pre');
    pre.className = 'out-pre logo';
    block.appendChild(pre);
    terminalOutput.appendChild(block);

    var name = document.createElement('p');
    name.className = 'out-line name';
    name.style.display = 'none';
    block.appendChild(name);

    typeText(pre, LAOTH_ART, SPEED_FAST, function () {
      scrollOutput();
      name.style.display = 'block';
      typeText(name, 'Onur Akdoğan', SPEED_FAST, function () {
        scrollOutput();
        if (done) done();
      }, scrollOutput);
    }, scrollOutput);
  }

  function initPortfolio() {
    terminalOutput.innerHTML = '';
    portfolioReady = false;
    isTyping = true;

    var intro = [
      '[guest@archlinux ~]$ start',
      '[*] loading /home/guest/portfolio ... ok',
      '[*] interactive session active',
      'Type \'help\' for available commands.'
    ];

    runChain([
      function (next) {
        typeOutLine(intro[0], 'dim', next);
      },
      function (next) {
        typeOutLine(intro[1], 'dim', next);
      },
      function (next) {
        typeOutLine(intro[2], 'dim', next);
      },
      function (next) {
        typeOutLine(intro[3], 'dim', next);
      },
      function (next) {
        typeLaothLogo(next);
      },
      function (next) {
        isTyping = false;
        portfolioReady = true;
        focusActiveInput();
        resetIdleTimer();
        next();
      }
    ], 0);
  }

  /* --- command output (typed, sequential) --- */
  function runCommand(cmd, done) {
    if (cmd === 'clear') {
      terminalOutput.innerHTML = '';
      done();
      return;
    }

    if (cmd === 'whoami') {
      runChain([
        function (next) { typeOutLine('whoami', 'title', next); },
        function (next) { typeOutLine(WHOAMI_TEXT, '', next); },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'experience') {
      runChain([
        function (next) { typeOutLine('Professional Experience', 'title', next); },
        function (next) { typeOutPre(EXPERIENCE_TEXT, '', next); },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'skills') {
      runChain([
        function (next) { typeOutLine('Skills & Technologies', 'title', next); },
        function (next) { typeOutPre(SKILLS_TREE, 'tree', next); },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'projects') {
      runChain([
        function (next) { typeOutLine('Recent Operations (Projects)', 'title', next); },
        function (next) { typeOutPre(PROJECTS_TABLE, '', next); },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'contact') {
      runChain([
        function (next) { typeOutLine('Links', 'title', next); },
        function (next) {
          var parts = makeOutPre('out-links');
          typeText(parts.el, CONTACT_PLAIN, SPEED_FAST, function () {
            parts.el.innerHTML = CONTACT_HTML;
            parts.el.className = 'out-links';
            scrollOutput();
            next();
          });
        },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'email') {
      runChain([
        function (next) { typeOutLine('Email', 'title', next); },
        function (next) {
          var parts = makeOutPre('out-links');
          typeText(parts.el, EMAIL_PLAIN, SPEED_FAST, function () {
            parts.el.innerHTML = EMAIL_HTML;
            parts.el.className = 'out-links';
            scrollOutput();
            next();
          });
        },
        function (next) { done(); }
      ], 0);
      return;
    }

    if (cmd === 'help') {
      typeOutPre(HELP_TEXT, '', done);
      return;
    }

    if (cmd === 'sudo') {
      typeOutLine('guest is not in the sudoers file. This incident will be reported.', 'out-error', done);
      return;
    }

    if (cmd === 'dance') {
      playDance(done);
      return;
    }

    typeOutLine('bash: ' + cmd + ': command not found', 'out-error', done);
  }

  function handleMainCommand() {
    if (!portfolioReady || isTyping) return;

    var cmd = mainInput.value.trim();
    mainInput.value = '';

    if (cmd === '') {
      focusActiveInput();
      return;
    }

    isTyping = true;
    typeOutLine('[guest@archlinux ~]$ ' + cmd, 'dim', function () {
      runCommand(cmd, function () {
        isTyping = false;
        scrollOutput();
        focusActiveInput();
      });
    });
  }

  /* --- boot screen helpers --- */
  function showCommandNotFound(cmd) {
    var promptLine = bootFooter.querySelector('.prompt-line');
    var history = document.createElement('d' + 'iv');
    history.className = 'cmd-output';
    var err = document.createElement('d' + 'iv');
    err.className = 'cmd-error';
    bootFooter.insertBefore(err, promptLine);
    bootFooter.insertBefore(history, err);

    isTyping = true;
    typeText(history, '[guest@archlinux ~]$ ' + cmd, SPEED_FAST, function () {
      typeText(err, 'bash: ' + cmd + ': command not found', SPEED_FAST, function () {
        isTyping = false;
        scrollBoot();
        focusActiveInput();
      }, scrollBoot);
    }, scrollBoot);
  }

  function handleBootCommand() {
    if (isTyping) return;

    var cmd = cmdInput.value.trim();
    cmdInput.value = '';

    if (cmd === 'start') {
      stopIdleTimer();
      bootScreen.classList.add('hidden');
      mainTerminal.classList.remove('hidden');
      initPortfolio();
      return;
    }

    if (cmd !== '') {
      showCommandNotFound(cmd);
    }

    focusActiveInput();
  }

  function lockBootScroll() {
    var block = function (e) {
      e.preventDefault();
    };
    bootScreen.addEventListener('wheel', block, { passive: false });
    bootScreen.addEventListener('touchmove', block, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (bootScreen.classList.contains('hidden')) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' ||
          e.key === 'PageDown' || e.key === 'Home' || e.key === 'End' ||
          (e.key === ' ' && e.target === document.body)) {
        e.preventDefault();
      }
    });
  }

  /* --- input listeners --- */
  cmdInput.addEventListener('keydown', function (e) {
    if (!promptReady || isTyping) return;
    resetIdleTimer();
    if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete(cmdInput, BOOT_COMMANDS);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBootCommand();
    }
  });

  mainInput.addEventListener('keydown', function (e) {
    if (!portfolioReady || isTyping) return;
    resetIdleTimer();
    if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete(mainInput, COMMANDS);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleMainCommand();
    }
  });

  document.addEventListener('keydown', function () {
    if (promptReady || portfolioReady) {
      resetIdleTimer();
    }
  });

  /* --- click anywhere: refocus command line (skip link clicks) --- */
  document.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') return;
    focusActiveInput();
    if (promptReady || portfolioReady) resetIdleTimer();
  });

  /* --- Ctrl+C stops looping dance video --- */
  document.addEventListener('keydown', function (e) {
    if (!danceActive) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      stopDance();
      resetIdleTimer();
    }
  });

  lockBootScroll();
  runBoot();
})();
