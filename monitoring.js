// MoniKas monitoring dashboard shortcut.
// This file adds a dashboard button without changing the existing app markup.
(function(){
  function addDashboardButton(){
    if(document.getElementById('monitoringDashboardBtn')) return;
    const container=document.querySelector('.head-actions');
    if(!container) return;
    const a=document.createElement('a');
    a.id='monitoringDashboardBtn';
    a.className='head-btn';
    a.href='./dashboard.html';
    a.textContent='📊 Dashboard';
    a.title='Buka Dashboard Monitoring Berkala';
    container.insertBefore(a,container.firstChild);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addDashboardButton); else addDashboardButton();
})();
