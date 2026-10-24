import {useState} from "react";
import "./App.css";

function App() {

  const [currentDate, setCurrentDate] = useState(new Date());

  function changeMonth(amount) {
    setCurrentDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth()+amount,1))
  }

  const monthlabel = currentDate.toLocaleDateString("en-US",
    {

      month: "long",

      year:"numeric",
    }
  )




  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">O</div>
          <div>
            <h1>Orbit</h1>
            <p>Your calendar, your space.</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-heading">WORKSPACE</p>
          <a className="nav-item active" href="#calendar">▦ Calendar</a>
          <a className="nav-item" href="#events">◷ Events</a>
          <a className="nav-item" href="#tasks">✓ Tasks</a>
          <a className="nav-item" href="https://google.com">Visit Google!</a>

          <p className="nav-heading">PREFERENCES</p>
          <a className="nav-item" href="#settings">⚙ Settings</a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Everything stays on your device
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">Workspace / Calendar</div>
          <div className="profile">J</div>
        </header>

        <section className="calendar-panel" id="calendar">
          <div className="calendar-toolbar">
            <div>
              <p className="eyebrow">YOUR SCHEDULE</p>
              <h2>Calendar</h2>
            </div>
            <div className="month-nav">
              <button onClick={() => changeMonth(-1)}>
                b
              </button>
              <span className="month-label">{monthlabel}</span>
              <button onClick={()=>changeMonth(1)}>
                f
              </button>
            </div>
            <button className="primary-button" onClick={()=>alert("hey!")}>
              + New event
            </button>
          </div>

          <div className="calendar-placeholder">
            <div>
              <span className="placeholder-icon">▦</span>
              <h3>Your time, in orbit.</h3>
              <p>
                Your calendar grid will live here.
                We're building it one step at a time.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
