// frontend/src/pages/Help_page.jsx
import React from "react";
import { Link } from "react-router-dom";
export default function Help_page() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-green-700">Help & Support</h1>
        <Link to="/user/dashboard" className="text-sm text-green-700 underline">← Back to Dashboard</Link>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-gray-100">
        <p className="text-gray-600">FAQs, contact info, and guides will appear here.</p>
      </div>
    </div>
  );
}
