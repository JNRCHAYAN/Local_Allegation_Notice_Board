import React, { useState } from "react";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Building,
  LogOut,
} from "lucide-react";

export default function Admin_home_page() {
  const [complaintList, setComplaintList] = useState([
    {
      id: 1,
      title: "Garbage Collection Delay",
      details: "Garbage has not been collected for 3 days in Ward 5.",
      file: null,
      status: "In Progress",
      date: "2025-10-18",
      department: "Municipality",
    },
    {
      id: 2,
      title: "Water Pipeline Leakage",
      details: "Leakage observed near main street, urgent repair needed.",
      file: "https://example.com/file.pdf",
      status: "Resolved",
      date: "2025-10-16",
      department: "Municipality",
    },
    {
      id: 3,
      title: "Street Light Not Working",
      details: "Street light near park is not functioning.",
      file: null,
      status: "Cancelled",
      date: "2025-10-12",
      department: "Municipality",
    },
  ]);

  const updateStatus = (id, newStatus) => {
    setComplaintList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  };

  return (
    <div className="min-h-screen w-full bg-green-50 text-gray-800 flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="w-full bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700 flex items-center space-x-2">
          <Building className="w-6 h-6 text-green-600" />
          <span>Public Allegation Portal</span>
        </h1>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img
              src="https://i.pravatar.cc/40"
              alt="Department Head"
              className="w-10 h-10 rounded-full border-2 border-green-500"
            />
            <div>
              <p className="font-medium">Welcome, Dept. Head 👋</p>
              <p className="text-xs text-gray-500">Department: Municipality</p>
            </div>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-1 hover:bg-green-700 transition">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ---------- Main Content ---------- */}
      <main className="flex-1 p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
            <FileText className="w-10 h-10 text-green-600 mb-2" />
            <p className="text-3xl font-bold text-green-700">
              {complaintList.length}
            </p>
            <p className="text-gray-600 font-medium">Total Complaints</p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
            <Clock className="w-10 h-10 text-yellow-500 mb-2" />
            <p className="text-3xl font-bold text-yellow-600">
              {complaintList.filter((c) => c.status === "In Progress").length}
            </p>
            <p className="text-gray-600 font-medium">In Progress</p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-green-600">
              {complaintList.filter((c) => c.status === "Resolved").length}
            </p>
            <p className="text-gray-600 font-medium">Resolved</p>
          </div>
        </div>

        {/* Complaints Table */}
        <section className="bg-white shadow-md rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <span>📋</span>
              <span>Department Complaints</span>
            </h2>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-700">
                <th className="p-3">#</th>
                <th className="p-3">Title</th>
                <th className="p-3">Details</th>
                <th className="p-3">File</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {complaintList.map((c, index) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3 text-gray-700">{c.details}</td>
                  <td className="p-3">
                    {c.file ? (
                      <a
                        href={c.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:underline"
                      >
                        View File
                      </a>
                    ) : (
                      <span className="text-gray-400">No File</span>
                    )}
                  </td>
                  <td
                    className={`p-3 font-semibold ${
                      c.status === "In Progress"
                        ? "text-yellow-600"
                        : c.status === "Resolved"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {c.status}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => updateStatus(c.id, "In Progress")}
                        className="border border-green-600 text-green-700 hover:bg-green-50 px-4 py-1.5 rounded-md text-sm font-medium transition"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => updateStatus(c.id, "Resolved")}
                        className="bg-green-600 text-white hover:bg-green-700 px-4 py-1.5 rounded-md text-sm font-medium transition"
                      >
                        Resolved
                      </button>
                      <button
                        onClick={() => updateStatus(c.id, "Cancelled")}
                        className="border border-gray-300 text-gray-600 hover:bg-gray-100 px-4 py-1.5 rounded-md text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Announcements Section */}
        <section className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <span>📢</span>
            <span>Department Updates</span>
          </h2>

          <ul className="space-y-3">
            <li className="flex items-center text-green-700">
              ✅ New garbage collection vehicles deployed in Ward 3 & 5.
            </li>
            <li className="flex items-center text-yellow-700">
              ⚙️ Routine maintenance scheduled for Oct 25, 2025 (12 AM - 2 AM).
            </li>
            <li className="flex items-center text-red-700">
              ⚡ Urgent: Review pending complaints before month-end.
            </li>
          </ul>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="bg-white shadow-inner text-center py-3 text-sm text-gray-500 mt-6">
        © {new Date().getFullYear()} Public Allegation Portal — Department Head Panel
      </footer>
    </div>
  );
}
