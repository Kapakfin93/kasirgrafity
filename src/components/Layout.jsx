import React from 'react'
import { useTime } from '../hooks/useTime'

export default function Layout({
    leftHeader,
    leftContent,
    rightHeader,
    rightContent,
    footer
}) {
    const time = useTime()

    return (
        <div className="layout-container">
            {/* HEADER */}
            <header className="header">
                <div className="brand">KASIR GRAFITY</div>
                <div className="time">{time.toLocaleTimeString('id-ID')}</div>
                <div className="user">Kasir 1</div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="main-grid">
                {/* LEFT PANEL: PRODUCTS */}
                <section className="panel left-panel">
                    <div className="panel-header">
                        {leftHeader}
                    </div>
                    <div className="panel-content scrollable">
                        {leftContent}
                    </div>
                </section>

                {/* RIGHT PANEL: RECEIPT */}
                <section className="panel right-panel">
                    <div className="panel-header">
                        {rightHeader}
                    </div>
                    <div className="panel-content scrollable">
                        {rightContent}
                    </div>
                    <div className="panel-footer">
                        {footer}
                    </div>
                </section>
            </main>

            <style>{`
        .layout-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .header {
          height: var(--header-height);
          background: #1e293b;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-lg);
          font-weight: bold;
          font-size: 1.2rem;
        }
        .main-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 400px;
          overflow: hidden;
        }
        .panel {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-border);
          background: var(--color-bg-card);
        }
        .left-panel {
          background: var(--color-bg-main);
        }
        .panel-header {
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          background: white;
          font-weight: bold;
        }
        .panel-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        .panel-footer {
          border-top: 1px solid var(--color-border);
          padding: var(--spacing-md);
          background: white;
        }
      `}</style>
        </div>
    )
}
