/* eslint-disable react/no-unescaped-entities */
import React from 'react';

const DataDeletion: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>User Data Deletion Instructions</h1>
      <p>If you would like to request the deletion of your data from Last Man Standing, please follow these steps:</p>
      <ol>
        <li>Email us at <strong>privacy@lastmanstanding.co.uk</strong> with the subject line "User Data Deletion Request".</li>
        <li>Include your name, email address, and any relevant account information.</li>
        <li>We will respond to your request and confirm the deletion within 30 days.</li>
      </ol>
      <p>For any questions, please contact our support team at <strong>support@lastmanstanding.com </strong>.</p>
    </div>
  );
};

export default DataDeletion;
