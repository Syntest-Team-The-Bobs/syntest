import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ConsistencyScoreChart({ participants }) {
  const data = {
    datasets: [
      {
        label: 'Participant Consistency',
        data: participants.map((p, index) => ({
          x: index + 1,
          y: p.consistency_score,
          participant: p.name
        })),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.raw.participant}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: 'Consistency Score'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Participant'
        }
      }
    }
  };

  return (
    <div style={{ height: '300px' }}>
      <Scatter data={data} options={options} />
    </div>
  );
}