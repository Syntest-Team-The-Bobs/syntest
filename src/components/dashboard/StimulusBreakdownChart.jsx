import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StimulusBreakdownChart({ breakdown }) {
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(251, 146, 60, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
  ];

  const data = {
    labels: breakdown.map(b => b.family) || [],
    datasets: [
      {
        data: breakdown.map(b => b.count) || [],
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
      }
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Pie data={data} options={options} />
    </div>
  );
}