import Spinner from './Spinner';

export default function Table({ columns, data, loading, emptyMessage = 'No data found.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th key={col.key} className={`table-header py-3 px-4 text-left ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex justify-center"><Spinner /></div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-sm">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || i} className="border-b border-slate-50/50 hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`py-4 px-4 text-slate-700 ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
