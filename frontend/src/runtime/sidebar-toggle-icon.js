(() => {
  const styleId = 'sidebar-toggle-icon-styles'

  const installStyles = () => {
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .sidebar-toggle {
        position: absolute;
        top: 8px !important;
        right: -13px !important;
        width: 32px !important;
        height: 32px !important;
        display: grid !important;
        place-items: center;
        font-size: 0;
        border: 1px solid rgba(148, 163, 184, .28) !important;
        border-radius: 9px;
        color: var(--text);
        box-shadow: 0 5px 14px rgba(2, 8, 23, .28);
        cursor: pointer;
        z-index: 20;
        transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease;
      }
      .sidebar.is-collapsed .sidebar-toggle { right: -13px !important; }
      .dashboard-shell.sidebar-collapsed .nav-label { display: none !important; }
      .dashboard-shell.sidebar-collapsed .nav-icon { display: inline-grid !important; }
      .nav-item { display: flex; align-items: center; gap: 9px; }
      .nav-item .nav-icon {
        display: inline-grid;
        flex: 0 0 16px;
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .dashboard-shell:not(.sidebar-collapsed) .sidebar-toggle {
        background: rgba(8, 17, 33, .96);
      }
      .dashboard-shell.sidebar-collapsed .sidebar-toggle {
        background: rgba(9, 14, 24, .96);
      }
      .sidebar-toggle:hover {
        color: var(--primary);
        border-color: rgba(94, 234, 212, .72) !important;
        background: rgba(20, 184, 166, .22) !important;
        box-shadow: 0 8px 18px rgba(20, 184, 166, .18);
        transform: translateY(-1px);
      }
      .sidebar-toggle:active { transform: translateY(0); }
      @media (min-width: 801px) {
        .sidebar { overflow: visible !important; }
      }
      @media (max-width: 800px) {
        .sidebar-toggle,
        .sidebar.is-collapsed .sidebar-toggle { right: 0 !important; }
      }
      .sidebar-toggle:focus-visible {
        border-color: var(--primary);
        outline: 2px solid rgba(94, 234, 212, .72);
        outline-offset: 2px;
      }
      .sidebar-toggle .sidebar-toggle-icon {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.25;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }
    `
    document.head.appendChild(style)
  }

  const enhance = () => {
    installStyles()
    const shell = document.querySelector('.dashboard-shell')
    const sidebar = shell?.querySelector('.sidebar')
    if (!shell || !sidebar) return
    let button = sidebar.querySelector('.sidebar-toggle')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.className = 'sidebar-toggle'
      sidebar.append(button)
    }
    if (!button.dataset.sidebarToggleBound) {
      button.dataset.sidebarToggleBound = '1'
      button.addEventListener('click', event => {
        event.preventDefault()
        const next = !shell.classList.contains('sidebar-collapsed')
        shell.classList.toggle('sidebar-collapsed', next)
        sidebar.classList.toggle('is-collapsed', next)
        enhance()
      })
    }
    sidebar.querySelectorAll('.nav-item').forEach((item, index) => {
      const labelText = item.textContent.trim()
      if (!item.querySelector('.nav-label')) {
        const label = document.createElement('span')
        label.className = 'nav-label'
        label.textContent = labelText
        item.replaceChildren(label)
      }
      if (!item.querySelector('.nav-icon')) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        icon.classList.add('nav-icon')
        icon.setAttribute('viewBox', '0 0 24 24')
        icon.setAttribute('aria-hidden', 'true')
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', index === 0 ? 'M4 12h16M12 4v16' : 'M5 5h14v14H5z')
        icon.append(path)
        item.prepend(icon)
      }
      if (!item.getAttribute('aria-label')) item.setAttribute('aria-label', labelText)
    })

    const collapsed = shell.classList.contains('sidebar-collapsed')
    const direction = collapsed ? 'right' : 'left'
    const label = collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label)
    if (button.title !== label) button.title = label

    let icon = button.querySelector('.sidebar-toggle-icon')
    if (!icon) {
      icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.classList.add('sidebar-toggle-icon')
      icon.setAttribute('viewBox', '0 0 24 24')
      icon.setAttribute('aria-hidden', 'true')
      icon.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
      button.replaceChildren(icon)
    }
    if (icon.dataset.sidebarDirection !== direction) {
      icon.dataset.sidebarDirection = direction
      icon.querySelector('path').setAttribute('d', collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6')
    }
  }

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      enhance()
    })
  }

  enhance()
  new MutationObserver(scheduleEnhance).observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'aria-label'],
    childList: true,
    subtree: true
  })
})()
