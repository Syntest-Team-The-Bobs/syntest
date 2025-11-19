export default function RecentTable({ title, rows, columns }) {
    return (
      <div className="dashboard-table-container">
        <h3 className="dashboard-table-title">{title}</h3>
  
        {rows && rows.length > 0 ? (
          <table className="dashboard-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
  
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col}>{row[col] || 'N/A'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-state-title">No data yet</div>
            <div className="dashboard-empty-state-text">
              Data will appear here once available
            </div>
          </div>
        )}
      </div>
    );
  }