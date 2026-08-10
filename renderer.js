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
    
    // Hide error
    errorMessage.style.display = 'none';
    
    // Change button text to show loading
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.innerText = 'Conectando...';
    submitBtn.disabled = true;

    // Send to main process
    window.electronAPI.saveServerUrl(url.href);
    
  } catch (err) {
    errorMessage.style.display = 'block';
  }
});

if (window.electronAPI && window.electronAPI.onConnectionError) {
  window.electronAPI.onConnectionError((event, errorDesc) => {
    const errorMessage = document.getElementById('error-message');
    const submitBtn = document.querySelector('.submit-btn');
    
    errorMessage.innerText = 'Falha ao conectar ao servidor. Verifique a URL e tente novamente.';
    errorMessage.style.display = 'block';
    
    submitBtn.innerText = 'Conectar';
    submitBtn.disabled = false;
  });
}
