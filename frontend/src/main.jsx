import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './information-density.css'
import { installRequestCoordinator } from './services/requestCoordinator'

installRequestCoordinator()

const root = createRoot(document.getElementById('root'))
root.render(<App />)
