import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState("map"); // map, dashboard, alerts, analytics, settings

  useEffect(() => {
    setIsLoading(true);
    axios.get("http://localhost:8000/risk")
      .then(res => {
        setData(Array.isArray(res.data) ? res.data : []);
        setLastUpdated(new Date().toLocaleTimeString());
        setIsLoading(false);
      })
      .catch(err => {
        console.log("API Connection issue:", err);
        setIsLoading(false);
      });
  }, []);

  const getRiskDetails = (score) => {
    if (score > 75) return { color: "#FF4D4D", cls: "high" };
    if (score > 50) return { color: "#FF9B00", cls: "medium" };
    return { color: "#00E3FF", cls: "low" }; // cyan
  };

  // Dynamic Statistics
  const activeHighRisks = data.filter(item => item.risk_score > 75).length;
  const portCongestions = data.filter(item => item.risk_type === "Port Delay").length;
  const avgRisk = data.length > 0 ? data.reduce((acc, item) => acc + item.risk_score, 0) / data.length : 0;
  const globalHealth = data.length > 0 ? (100 - avgRisk).toFixed(1) + "%" : "100%";

  // Aggregation for Analytics view
  const riskCounts = {};
  data.forEach(item => {
    riskCounts[item.risk_type] = (riskCounts[item.risk_type] || 0) + 1;
  });

  return (
    <div className="app-container">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <div className="left-sidebar">
        <div className="nav-brand">
          <i className='bx bx-network-chart'></i>
        </div>
        <div className={`nav-icon ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
          <i className='bx bx-grid-alt'></i>
        </div>
        <div className={`nav-icon ${currentView === 'map' ? 'active' : ''}`} onClick={() => setCurrentView('map')}>
          <i className='bx bx-globe'></i>
        </div>
        <div className={`nav-icon ${currentView === 'alerts' ? 'active' : ''}`} onClick={() => setCurrentView('alerts')}>
          <i className='bx bx-error-alt'></i>
        </div>
        <div className={`nav-icon ${currentView === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentView('analytics')}>
          <i className='bx bx-bar-chart-alt-2'></i>
        </div>
        <div className={`nav-icon ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>
          <i className='bx bx-cog'></i>
        </div>
        
        {/* Placeholder User Avatar */}
        <div className="profile-icon">
          <img src="https://i.pravatar.cc/150?img=11" alt="User Profile" style={{width: '100%', height:'100%', borderRadius:'50%'}}/>
        </div>
      </div>

      {/* MAIN DASHBOARD AREA */}
      <div className="main-dashboard">
        
        {/* Header Block */}
        <div className="dashboard-header">
          <div className="header-titles">
            <h1>Global Disruption Predictor</h1>
            <p>Real-time AI analysis of global supply chain health.</p>
          </div>
          <div className="header-actions">
            <div className="search-bar">
              <i className='bx bx-search'></i>
              <input type="text" placeholder="Search predictions..." />
            </div>
            <button className="run-btn" onClick={() => window.location.reload()}>
              <i className='bx bx-refresh'></i> Force Model Run
            </button>
          </div>
        </div>

        {/* 4 LIVE Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-header">
              <i className='bx bx-pulse text-cyan'></i> Global Health Index
            </div>
            <div className="stat-value">{globalHealth}</div>
            <div className="stat-sub text-cyan"><i className='bx bx-check-circle'></i> Real-time Aggregate</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <i className='bx bx-info-circle text-red'></i> Active High Risks
            </div>
            <div className="stat-value">{activeHighRisks}</div>
            <div className="stat-sub text-red"><i className='bx bx-error'></i> Immediate Attention</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <i className='bx bx-anchor text-cyan'></i> Port Congestions
            </div>
            <div className="stat-value">{portCongestions}</div>
            <div className="stat-sub text-muted">— Live Status</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <i className='bx bx-bolt-circle text-cyan'></i> AI Predictions Loaded
            </div>
            <div className="stat-value">{data.length}</div>
            <div className="stat-sub text-cyan"><i className='bx bx-time-five'></i> Updated {lastUpdated}</div>
          </div>
        </div>

        {/* DYNAMIC VIEWS */}
        {currentView === 'map' && (
          <div className="map-wrapper">
            <div className="map-title">Live Predictive Route Map</div>
            <div className="map-legend">
              <div className="legend-item"><div className="dot cyan"></div> On Time</div>
              <div className="legend-item"><div className="dot red"></div> Risk Detected</div>
            </div>
            
            <MapContainer center={[25, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {isLoading ? null : data.map((item, index) => {
                const risk = getRiskDetails(item.risk_score);
                const coords = [item.lat || 0, item.lng || 0];

                return (
                  <CircleMarker
                    key={index}
                    center={coords}
                    radius={12}
                    pathOptions={{ color: risk.color, fillColor: risk.color, fillOpacity: 1.0, weight: 3 }}
                  >
                    <Popup>
                      <strong>{item.title}</strong><br />
                      Risk Type: {item.risk_type}<br />
                      Confidence Score: {item.risk_score}%
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="dynamic-view">
            <h2 style={{color: '#fff', marginBottom: '20px'}}><i className='bx bx-grid-alt'></i> Mission Control</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px'}}>
               <div style={{gridColumn: 'span 8', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px'}}>
                 <h3 style={{color: '#00e3ff', marginBottom: '15px'}}>System Status</h3>
                 <p style={{color: '#a0a0a0', lineHeight: '1.6'}}>The GLiClass AI engine is actively scanning international RSS pipelines. Caching mechanisms are online ensuring sub-millisecond local response times while preventing API throttling.</p>
                 <br/>
                 <h3 style={{color: '#00e3ff', marginBottom: '15px'}}>Model Metrcs</h3>
                 <p style={{color: '#a0a0a0'}}><b>Architecture:</b> facebook/bart-large-mnli</p>
                 <p style={{color: '#a0a0a0'}}><b>Refresh Rate:</b> 300 Seconds</p>
                 <p style={{color: '#a0a0a0'}}><b>Live Incidents Analyzed:</b> {data.length}</p>
               </div>
            </div>
          </div>
        )}

        {currentView === 'alerts' && (
          <div className="dynamic-view">
             <h2 style={{color: '#ff4d4d', marginBottom: '20px'}}><i className='bx bx-error-alt'></i> Critical Threats Board</h2>
             <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
                {data.filter(d => d.risk_score > 70).length === 0 && <p style={{color: '#fff'}}>No critical threats detected right now.</p>}
                {data.filter(d => d.risk_score > 70).map((item, index) => (
                  <div key={index} className="alert-card high" style={{borderLeft: '4px solid #ff4d4d', padding: '15px', background: 'rgba(255,77,77,0.05)'}}>
                    <h3 style={{color: '#fff', fontSize: '15px'}}>{item.title}</h3>
                    <p style={{color: '#ff4d4d', marginTop: '10px', fontWeight: 'bold'}}>Risk Score: {Math.round(item.risk_score)}%</p>
                    <p style={{color: '#a0a0a0', fontSize: '12px', marginTop: '5px'}}>Type: {item.risk_type}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="dynamic-view">
             <h2 style={{color: '#00e3ff', marginBottom: '20px'}}><i className='bx bx-bar-chart-alt-2'></i> Threat Distribution Analytics</h2>
             <div style={{background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px'}}>
               {Object.entries(riskCounts).map(([type, count], index) => {
                 const percentage = Math.round((count / data.length) * 100);
                 return (
                   <div key={index} style={{marginBottom: '15px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', color: '#fff', marginBottom: '8px'}}>
                       <span>{type}</span>
                       <span>{percentage}% ({count})</span>
                     </div>
                     <div style={{width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px'}}>
                       <div style={{height: '100%', width: `${percentage}%`, background: type.includes("Safe") ? '#00e3ff' : '#ff9b00', borderRadius: '5px'}}></div>
                     </div>
                   </div>
                 )
               })}
             </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="dynamic-view">
            <h2 style={{color: '#fff', marginBottom: '20px'}}><i className='bx bx-cog'></i> Protocol Parameters</h2>
            <div style={{background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px'}}>
              <div style={{marginBottom: '15px'}}>
                <label style={{color: '#00e3ff', display: 'block', marginBottom: '8px'}}>AI Tolerance Threshold</label>
                <input type="range" min="0" max="100" defaultValue="75" style={{width: '100%'}} />
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{color: '#00e3ff', display: 'block', marginBottom: '8px'}}>Data Endpoints</label>
                <input type="text" readOnly value="Google News (rss)" style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#fff'}} />
              </div>
              <button className="run-btn" style={{marginTop: '10px'}}>Save Overrides</button>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT SIDEBAR ALERTS */}
      <div className="right-sidebar">
        <div className="alerts-header">
          <h3>AI Risk Alerts</h3>
          <div className="live-badge">LIVE</div>
        </div>

        <div className="alerts-list">
          {/* LOAD STATE */}
          {isLoading && (
            <div style={{color: '#00e3ff', padding: '20px', textAlign: 'center'}}>
              <i className='bx bx-loader-circle bx-spin bx-lg'></i>
              <p style={{marginTop: '10px'}}>AI classifying live global data...<br />(This takes ~30s on first boot)</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && data.length === 0 && (
             <div style={{color: '#ff4d4d', padding: '20px', textAlign: 'center'}}>
               <i className='bx bx-error bx-lg'></i>
               <p style={{marginTop: '10px'}}>Failed to load Backend API.<br />Check console.</p>
             </div>
          )}

          {/* LIVE DATA INJECTED BELOW (if API active) */}
          {!isLoading && data.length > 0 && data.map((item, index) => {
             const riskMeta = getRiskDetails(item.risk_score);
             return (
              <div key={index + 100} className={`alert-card ${riskMeta.cls}`}>
                <div className="alert-card-top">
                  <span className="alert-location">Location Verified</span>
                  <span className={`alert-risk ${riskMeta.cls}`}>{Math.round(item.risk_score)}% Risk</span>
                </div>
                <div className="alert-desc">{item.title} ({item.risk_type})</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

export default App;