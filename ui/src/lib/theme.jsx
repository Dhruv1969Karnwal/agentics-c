import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('agentlytics-theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('agentlytics-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() { return useContext(ThemeContext) }
