import React from 'react';
import Layout from '../../components/Layout';

const Attendance = () => {
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>
        <p className="mt-4 text-gray-600">Select a class to mark attendance.</p>
      </div>
    </Layout>
  );
};

// This is the line that was missing or broken:
export default Attendance;