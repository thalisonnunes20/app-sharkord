let currentLang = 'pt-BR';
let t = (key) => key;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.electronAPI && window.electronAPI.getLanguage && window.sharkordI18n) {
    currentLang = await window.electronAPI.getLanguage();
    t = (key) => window.sharkordI18n[currentLang][key] || window.sharkordI18n['pt-BR'][key] || key;
    
    // Process data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.innerText = t(key);
    });
    
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
  }
});

document.getElementById('setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const urlInput = document.getElementById('server-url');
  const errorMessage = document.getElementById('error-message');
  let urlValue = urlInput.value.trim();
  
  if (!urlValue.startsWith('http://') && !urlValue.startsWith('https://')) {
    // try prepending https:// if missing
    urlValue = 'https://' + urlValue;
  }

  try {
    const url = new URL(urlValue);
    
    // Valida se o domínio começa com sharkord.
    if (!url.hostname.startsWith('sharkord.')) {
      throw new Error('O domínio deve iniciar com sharkord.');
    }

    // Hide error
    errorMessage.style.display = 'none';
    
    // Change button text to show loading
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.innerText = t('btnConnecting');
    submitBtn.disabled = true;

    // Send to main process
    window.electronAPI.saveServerUrl(url.href);
    
  } catch (err) {
    if (err.message === 'O domínio deve iniciar com sharkord.') {
      errorMessage.innerText = t('errorDomain');
    } else {
      errorMessage.innerText = t('errorInvalidUrl');
    }
    errorMessage.style.display = 'block';
  }
});

if (window.electronAPI && window.electronAPI.onConnectionError) {
  window.electronAPI.onConnectionError((event, errorDesc) => {
    const errorMessage = document.getElementById('error-message');
    const submitBtn = document.querySelector('.submit-btn');
    
    errorMessage.innerText = t('errorConn');
    errorMessage.style.display = 'block';
    
    submitBtn.innerText = t('btnConnect');
    submitBtn.disabled = false;
  });
}

// Carrega os servidores recentes ao iniciar a página
if (window.electronAPI && window.electronAPI.getRecentServers) {
  window.electronAPI.getRecentServers().then(recents => {
    if (recents && recents.length > 0) {
      const container = document.getElementById('recent-servers-container');
      const list = document.getElementById('recent-servers-list');
      
      container.classList.remove('hidden');
      
      recents.forEach(url => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left bg-[#2b2d31] hover:bg-[#3f4147] text-[#dbdee1] text-[13px] py-2 px-3 rounded-[3px] transition-colors duration-200 flex items-center gap-2 overflow-hidden';
        
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#b5bac1] flex-shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> 
                         <span class="truncate">${url}</span>`;
        
        btn.onclick = () => {
          document.getElementById('server-url').value = url;
          document.getElementById('setup-form').dispatchEvent(new Event('submit'));
        };
        
        list.appendChild(btn);
      });
    }
  }).catch(err => console.error('Erro ao carregar recentes:', err));
}
