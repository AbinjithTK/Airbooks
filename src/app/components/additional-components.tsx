import { X, AlertCircle, CheckCircle, Info, Bell, Menu } from 'lucide-react';

export function BadgesSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Badges & Pills</h3>
      <div className="flex flex-wrap gap-3">
        <span className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium">
          Default
        </span>
        <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-medium">
          Purple
        </span>
        <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
          Success
        </span>
        <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
          Warning
        </span>
        <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
          Error
        </span>
        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full text-sm font-medium">
          Neutral
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="px-3 py-1 border-2 border-black dark:border-white text-gray-900 dark:text-white rounded-full text-sm font-medium">
          Outlined
        </span>
        <span className="px-3 py-1 border-2 border-purple-500 text-purple-500 rounded-full text-sm font-medium">
          Purple
        </span>
        <span className="px-3 py-1 border-2 border-green-500 text-green-500 rounded-full text-sm font-medium">
          Success
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-medium">
          Small
        </span>
        <span className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-md text-sm font-medium">
          Medium
        </span>
        <span className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-base font-medium">
          Large
        </span>
      </div>
    </div>
  );
}

export function AlertsSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Alerts & Notifications</h3>
      <div className="space-y-4 max-w-3xl">
        {/* Success Alert */}
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Success!</h4>
            <p className="text-sm text-green-800 dark:text-green-200">Your changes have been saved successfully.</p>
          </div>
          <button className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Error</h4>
            <p className="text-sm text-red-800 dark:text-red-200">There was a problem processing your request.</p>
          </div>
          <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Alert */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Information</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">This feature will be updated next week.</p>
          </div>
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TablesSection() {
  const data = [
    { id: '001', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
    { id: '002', name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active' },
    { id: '003', name: 'Carol Davis', email: 'carol@example.com', role: 'Editor', status: 'Inactive' },
    { id: '004', name: 'David Wilson', email: 'david@example.com', role: 'User', status: 'Active' },
  ];

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Tables</h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">{row.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{row.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{row.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.status === 'Active' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NavigationSection() {
  return (
    <div className="space-y-12">
      {/* Horizontal Nav */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Horizontal Navigation</h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <nav className="flex items-center gap-6">
            <a href="#" className="text-gray-900 dark:text-white font-medium hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
              Dashboard
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Products
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Orders
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Customers
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Analytics
            </a>
          </nav>
        </div>
      </div>

      {/* Vertical Sidebar */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Vertical Sidebar</h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-xs">
          <div className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium">
              <Menu className="w-5 h-5" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              Notifications
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Info className="w-5 h-5" />
              Settings
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Tabs</h3>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <button className="pb-4 border-b-2 border-black dark:border-white text-gray-900 dark:text-white font-medium">
              Overview
            </button>
            <button className="pb-4 border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              Analytics
            </button>
            <button className="pb-4 border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              Reports
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function ModalsSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Modal Example</h3>
      <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-12 flex items-center justify-center min-h-[400px]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Action</h3>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to continue with this action? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium">
              Cancel
            </button>
            <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IconsSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Icon System</h3>
      <p className="text-gray-600 dark:text-gray-400">Using Lucide React icon library for consistent iconography.</p>
      <div className="grid grid-cols-8 gap-6">
        {[Bell, Menu, X, Info, AlertCircle, CheckCircle].map((Icon, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Icon className="w-6 h-6 text-gray-900 dark:text-white" />
          </div>
        ))}
      </div>
    </div>
  );
}
