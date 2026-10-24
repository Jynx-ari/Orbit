import {useState} from "react";
import {
  CalendarDays,
  Check,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Bell,
  Activity,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import "./App.css";

function App() {

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [calendarView, setCalendarView] = useState("month");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [customEvents, setCustomEvents] = useState({});

  function changeMonth(amount) {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + amount, 1));
    setSelectedDay(1);
  }

  const monthLabel = currentDate.toLocaleDateString("en-US",
    {
      month: "long",
      year:"numeric",
    }
  )

  const year = currentDate.getFullYear();
  const decadeStart = Math.floor(year / 10) * 10;
  const firstDay = new Date(year, currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const events = {
    3: [{ label: "Quarterly sync", color: "gold" }],
    8: [{ label: "Design review", color: "blue" }],
    15: [{ label: "Lunch with team", color: "green" }],
    18: [{ label: "Product launch", color: "purple" }],
    22: [{ label: "Sales meeting", color: "red" }],
    24: [{ label: "Team market", color: "teal" }],
  };

  const allEvents = { ...events, ...customEvents };

  function pressDate() {
    setCalendarView((view) => {
      if (view === "month") return "year";
      if (view === "year") return "many-years";
      return "month";
    });
  }

  function getCalendarLabel() {
    if (calendarView === "year") return String(year);
    if (calendarView === "many-years") {
      return `${decadeStart}-${decadeStart + 9}`;
    }
    return monthLabel;
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
    setCalendarView("month");
  }

  function addEvent() {
    const label = window.prompt("Name this event");
    if (!label?.trim() || !selectedDay) return;
    setCustomEvents((items) => ({
      ...items,
      [selectedDay]: [...(items[selectedDay] || []), { label: label.trim(), color: "teal" }],
    }));
  }




  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={17} /></div>
          <div>
            <h1>Orbit</h1>
            <p>Your calendar, your space.</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-heading">WORKSPACE</p>
          <a className="nav-item active" href="#calendar"><CalendarDays size={14} /> Calendar</a>
          <a className="nav-item" href="#events"><SlidersHorizontal size={14} /> Events</a>
          <a className="nav-item" href="#tasks"><Check size={14} /> Tasks</a>

          <p className="nav-heading">PREFERENCES</p>
          <a className="nav-item" href="#settings"><Settings size={14} /> Settings</a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Everything stays on your device
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>Calendar</strong></div>
          <div className="topbar-actions">
            <button className="topbar-icon" aria-label="Activity"><Activity size={15} /></button>
            <button className="topbar-icon notification" aria-label="Notifications"><Bell size={15} /><span /></button>
            <button className="topbar-icon" aria-label="Help"><CircleHelp size={15} /></button>
            <button className="profile" aria-label="Open profile"><UserRound size={15} /></button>
          </div>
        </header>

        <section className="calendar-panel" id="calendar">
          <div className="calendar-toolbar">
            <button className="toolbar-icon" aria-label="Toggle sidebar"><Grid2X2 size={15} /></button>
            <form className="search-form" action="/search-result-page" method="GET">
              <Search className="search-icon" size={15} />
              <input
                className="search-field"
                type="search"
                name="q"
                placeholder="Search here..."
                aria-label="Search content"
              />
            </form>
          </div>

          <div className="calendar-actions">
            <button className="primary-button" onClick={addEvent}><Sparkles size={13} /> New event</button>
            <button className="today-button" onClick={goToToday}><CalendarDays size={13} /> Today</button>
          </div>

          <div className="calendar-content">
            <aside className="calendar-sidebar">
              <div className="mini-calendar">
                <div className="mini-calendar-heading">
                  <strong>{monthLabel}</strong>
                  <span><ChevronLeft size={13} /><ChevronRight size={13} /></span>
                </div>
                <div className="mini-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="mini-grid">{calendarDays.slice(0, 35).map((day, index) => <button className={day === selectedDay ? "selected-day" : ""} onClick={() => day && setSelectedDay(day)} key={`${day}-${index}`}>{day}</button>)}</div>
              </div>
              <div className="filter-panel">
                <h3>Event filters</h3>
                {["All", "Family", "Business", "Personal", "Holiday", "Etc"].map((filter, index) => <label key={filter}><input type="checkbox" defaultChecked={index === 0} /> <span className={`filter-dot filter-${index}`} />{filter}</label>)}
              </div>
            </aside>

            <div className="calendar-main">
              <div className="calendar-main-heading">
                <button className="arrow-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
                <button className="month-label" onClick={pressDate}>{getCalendarLabel()}</button>
                <button className="arrow-button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
                <div className="view-control">
                  <button className="view-button" onClick={() => setShowViewMenu((visible) => !visible)}>Month <ChevronDown size={12} /></button>
                  {showViewMenu && <div className="view-menu"><button onClick={() => setShowViewMenu(false)}>Month</button><button onClick={() => { setCalendarView("year"); setShowViewMenu(false); }}>Year</button></div>}
                </div>
              </div>
              <div className="calendar-grid">
                <div className="weekday-row">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="days-grid">{calendarDays.map((day, index) => <button className={`day-cell ${day === selectedDay ? "today" : ""}`} onClick={() => day && setSelectedDay(day)} key={`${day}-${index}`}><span>{day}</span>{day && allEvents[day]?.map((event) => <div className={`event-chip ${event.color}`} key={event.label}>{event.label}</div>)}</button>)}</div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
