<div align="center">

# 🌐 NetPulse
### Real-Time Network Intelligence & Anomaly Detection Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Scapy](https://img.shields.io/badge/Scapy-Packet_Sniffing-EB4034?style=for-the-badge)](https://scapy.net/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**NetPulse** is a modern, full-stack network observability and security intelligence platform. It captures live Layer 3/4 network traffic, aggregates high-frequency flows, computes real-time bandwidth metrics, flags security anomalies (spikes, port scans, floods), and streams rich telemetry to an ultra-responsive, executive command center.

[Key Capabilities](#-key-capabilities) • [System Architecture](#-system-architecture) • [Dashboard Tour](#-dashboard-walkthrough) • [Quick Start](#-quick-start) • [Anomaly Engine](#-anomaly-detection-engine) • [API & Sockets](#-api--websocket-reference) • [Tech Stack](#-tech-stack)

</div>

---

## ⚡ Problem & Vision

* **The Problem:** Modern networks transmit gigabytes of mission-critical data every minute. Traditional network analysis tools like Wireshark produce overwhelming walls of raw hex packets that are difficult to parse in real time. Enterprise observability platforms (Datadog, Splunk) cost tens of thousands of dollars and carry heavy agent overhead.
* **The Solution:** NetPulse bridges this divide. It provides a lightweight, end-to-end telemetry pipeline that converts raw network frames into actionable bandwidth telemetry, protocol breakdowns, endpoint catalogues, and automated security alerts in sub-seconds.

---

## ✨ Key Capabilities

- 📡 **Live Packet Ingestion & DPI (Deep Packet Inspection):** Asynchronously sniffs Layer 3 & Layer 4 network frames (TCP, UDP, ICMP, DNS, HTTP/S, SSH) via Scapy and raw OS sockets.
- ⚡ **Sub-Second Telemetry via WebSockets:** Real-time dual-band streaming of Ingress (Rx) and Egress (Tx) throughput with smooth 60 FPS charts.
- 🖥️ **Network Endpoint & Top-Talker Discovery:** Automatically fingerprints active network nodes, mapping IP/MAC addresses, connection states, and cumulative bandwidth consumption.
- 📊 **Deep Protocol & Port Analytics:** Visualizes Layer 4/7 protocol distribution and identifies abnormal destination port activity (e.g., unauthorized SSH, IRC, or exploit ports).
- 🚨 **Heuristic Anomaly Detection:** Real-time statistical engine flags bandwidth surges ($2\sigma$ deviation), rapid port scanning sweeps, traffic floods, and rogue protocol usage.
- 📈 **Long-Term Historical Capacity Planning:** Aggregates time-series traffic metrics over hourly, daily, and weekly intervals for capacity forecasting.
- 🛡️ **Zero-Downtime Fallback Architecture:** Features a built-in deterministic simulation engine so the dashboard remains fully populated and functional even in restricted sandbox environments.

---

## 🏗️ System Architecture

```
                                      NETPULSE ARCHITECTURE
                                      
  ┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
  │      NETWORK TRAFFIC LAYER      │                 │       STORAGE & PERSISTENCE     │
  │  Ethernet / Wi-Fi Interface    │                 │  PostgreSQL / SQLite Database   │
  │  (Promiscuous Mode / Npcap)     │                 │  (flows, packets, anomalies)    │
  └────────────────┬────────────────┘                 └────────────────┬────────────────┘
                   │                                                   ▲
                   ▼                                                   │
  ┌─────────────────────────────────┐                 ┌────────────────┴────────────────┐
  │     PYTHON CAPTURE ENGINE       │                 │       NODE.JS API SERVER        │
  │  • Scapy Sniffer (L3/L4 Parser) │───[REST/Batch]─▶│  • Express REST API             │
  │  • Statistical Aggregator       │                 │  • Socket.IO Telemetry Stream   │
  │  • Real-time Anomaly Detector   │                 │  • Historical Queries           │
  └─────────────────────────────────┘                 └────────────────┬────────────────┘
                                                                       │
                                                       [WebSocket / JSON Events]
                                                                       │
                                                                       ▼
                                                      ┌─────────────────────────────────┐
                                                      │     REACT EXECUTIVE DASHBOARD   │
                                                      │  • Vite + Tailwind CSS          │
                                                      │  • Framer Motion 60 FPS Charts   │
                                                      │  • Interactive Threat Feeds     │
                                                      └─────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
NetPulse/
├── capture/                  # Python Packet Capture & Analysis Engine
│   ├── aggregator.py         # Rolling window flow & bandwidth aggregation
│   ├── anomaly.py            # Heuristic anomaly & threat detection
│   ├── api_client.py         # HTTP client to push telemetry to Node server
│   ├── config.py             # Environment configuration & thresholds
│   ├── db.py                 # Direct database writer (PostgreSQL/SQLite)
│   ├── main.py               # Capture daemon entry point & CLI runner
│   ├── parser.py             # Packet header dissection (IP, TCP, UDP, ICMP)
│   ├── requirements.txt      # Python dependencies (scapy, psycopg2, etc.)
│   └── sniffer.py            # Raw socket & network interface listener
│
├── database/                 # Database Schemas & Migrations
│   └── schema.sql            # PostgreSQL & SQLite relational table schema
│
├── server/                   # Node.js Express & WebSocket Telemetry Server
│   ├── src/
│   │   ├── routes/           # REST endpoints (overview, devices, traffic, etc.)
│   │   ├── db.js             # Database connection pool & query handlers
│   │   ├── index.js          # Express app, Socket.IO broadcast, server loop
│   │   └── socket.js         # Client connection handling & event streaming
│   ├── package.json          # Node server dependencies
│   └── .env.example          # Sample server environment configuration
│
├── dashboard/                # React 18 + Vite Executive Command Center
│   ├── src/
│   │   ├── components/       # Reusable UI widgets, charts, and tables
│   │   │   ├── Charts/       # BandwidthChart, ProtocolPie, PortUsageChart
│   │   │   ├── Layout/       # Header, Sidebar, Container
│   │   │   ├── Tables/       # TrafficTable, DeviceList
│   │   │   └── Widgets/      # StatCard, AnomalyFeed
│   │   ├── hooks/            # useSocket, useApi, usePolling custom hooks
│   │   ├── pages/            # Multi-page views (Home, Overview, Devices, etc.)
│   │   ├── utils/            # Mock data engine & formatting helpers
│   │   ├── App.jsx           # Client router & page navigation
│   │   └── main.jsx          # React DOM mounting
│   ├── package.json          # Dashboard dependencies
│   └── vite.config.js        # Vite build & proxy configuration
│
├── .gitignore                # Git exclusions (node_modules, caches, .env)
└── README.md                 # Project documentation
```

---

## 🖥️ Dashboard Walkthrough

| Page | Route | Description |
| :--- | :--- | :--- |
| **Project Portal** | `/` | AEROSCAN-style executive landing page displaying the mission statement, live system KPIs, pipeline flow, and technical specifications. |
| **Executive Overview** | `/dashboard` | The NOC commander view featuring real-time bandwidth meters (Rx/Tx Mbps), active device counts, packet processing rates, and live anomaly cards. |
| **Network Devices** | `/devices` | Inventory of all discovered endpoints on the subnet, ranked by total bandwidth consumption ("Top Talkers") with MAC/IP mapping. |
| **Traffic Inspector** | `/traffic` | Ultra-fast live packet stream displaying individual flows with timestamp, source/destination IP:port, protocol tag, and byte size. |
| **Protocols & Ports** | `/protocols` | Layer 4 & Layer 7 protocol breakdown (TCP, UDP, ICMP, DNS, HTTPS, SSH) with dynamic port utilization bar charts. |
| **SecOps Threat Center** | `/anomalies` | Dedicated security alert feed categorizing traffic spikes, port scans, and flood attempts with severity ratings (Critical, Warning, Info). |
| **Historical Trends** | `/historical` | Long-term aggregation charts showing aggregate data transfer volume and usage patterns across hourly, daily, and weekly windows. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18.0+) & `npm`
- **Python** (v3.10+)
- *(Optional)* **PostgreSQL** 15+ (or run with built-in zero-config SQLite / Mock mode)
- *(Optional)* **Npcap** (Windows) or **libpcap** (Linux) for hardware packet capture

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/PremKudale/NetPulse---Network-Intelligence-Platform.git
cd NetPulse---Network-Intelligence-Platform
```

---

### Step 2: Launch the React Dashboard

The dashboard features an automatic fallback simulation engine, meaning it works immediately out of the box with rich, populated data!

```bash
cd dashboard
npm install
npm run dev
```
> Open your browser at **`http://localhost:5173`** to access the NetPulse interface.

---

### Step 3: (Optional) Launch the Backend API & WebSocket Server

```bash
cd ../server
npm install
cp .env.example .env
npm run dev
```
> Server runs at **`http://localhost:3001`** with WebSocket streaming enabled.

---

### Step 4: (Optional) Launch the Packet Capture Engine

```bash
cd ../capture
pip install -r requirements.txt

# Option A: Simulated Demo Mode (no administrator privileges needed)
python main.py --demo

# Option B: Live Network Capture (requires admin privileges)
# On Windows: Run command prompt as Administrator
# On Linux / macOS: sudo python main.py
python main.py
```

---

## ⚠️ Anomaly Detection Engine

NetPulse continuously evaluates network metrics against statistical heuristics:

1. **Bandwidth Spikes:** Tracks a rolling Gaussian baseline of throughput ($\mu$ and $\sigma$). If throughput exceeds $\mu + 2\sigma$, a **Warning/Critical Spike** alert is generated.
2. **Port Scan Detection:** Maintains a sliding 10-second window of unique destination ports targeted by each source IP. Exceeding the threshold triggers a **Port Scan Sweep** alert.
3. **Traffic Floods:** Detects packets-per-second surges from a single host exceeding configured saturation rates (e.g. > 500 pkts/sec).
4. **Protocol Anomalies:** Flags unexpected protocol distribution on reserved corporate ports.

---

## 🔌 API & WebSocket Reference

### REST Endpoints
* `GET /api/overview` — Current system throughput, active device count, packet rate.
* `GET /api/devices` — Catalogue of active network endpoints with byte usage.
* `GET /api/traffic` — Paginated recent packet flow records with filtering.
* `GET /api/protocols` — Layer 4/7 protocol distribution percentages.
* `GET /api/anomalies` — List of flagged network anomalies.
* `POST /api/traffic/ingest` — Ingestion endpoint for packet capture engine.

### WebSocket Events (`ws://localhost:3001`)
* `stats:update` — Emits real-time bandwidth and packet counter updates every second.
* `packets:new` — Streams newly captured packet records to the live inspector.
* `anomaly:alert` — Broadcasts immediate threat alerts when detected.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Framer Motion, Chart.js, React-Chartjs-2, Vanilla CSS Glassmorphism |
| **Backend API** | Node.js, Express, Socket.IO, CORS |
| **Packet Engine** | Python 3, Scapy, Raw Sockets, `psutil`, `psycopg2` |
| **Database** | PostgreSQL 16 / SQLite 3 |
| **Design System** | Custom Glassmorphic Dark UI, SVG Iconography, 60 FPS Canvas Animations |

---

## 🔒 Privacy & Compliance

NetPulse is built for **authorized network administration and security monitoring**. The capture engine extracts **header metadata only** (Source/Destination IP, Port, Protocol, Frame Length) and never records or inspects unencrypted payload contents or private user communications.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information. Built for the Computer Networks Technology (CNT) project exhibition.
