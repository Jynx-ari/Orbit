import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
    const [message, setMessage] = useState("Your calendar, your space.");

    return (
        <main>
            <h1>Orbit</h1>
            <p>{message}</p>

            <button onClick={() => setMessage("Let's get organized.")}>
                Click me
            </button>
        </main>
    );
}
export default App
