(() => {
  const styleId = 'sidebar-toggle-icon-styles'

  const installStyles = () => {
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .sidebar-toggle {
        top: 8px !important;
        right: -13px !important;
        width: 32px !important;
        height: 32px !important;
        font-size: 0;
        border: none !important;
        transition: background-color .18s ease, border-color .18s ease, color .18s ease;
      }
      .sidebar.is-collapsed .sidebar-toggle { right: -13px !important; }
      .dashboard-shell:not(.sidebar-collapsed) .sidebar-toggle {
        background: rgba(9, 14, 24, .96);
      }
      .dashboard-shell.sidebar-collapsed .sidebar-toggle {
        background: rgba(8, 17, 33, .96);
      }
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
    const button = shell?.querySelector('.sidebar-toggle')
    if (!button) return

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
