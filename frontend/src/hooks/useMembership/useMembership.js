import { useState, useEffect } from 'react';

export const useMembership = () => {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/membership');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setMembership(null);
          return;
        }
        throw new Error('Failed to fetch membership');
      }
      
      const data = await response.json();
      setMembership(data.membership);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMembership = async (updates) => {
    try {
      const response = await fetch('/api/membership', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update membership');
      }

      const data = await response.json();
      setMembership(data.membership);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const extendMembership = async (days) => {
    try {
      const response = await fetch('/api/membership/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });

      if (!response.ok) {
        throw new Error('Failed to extend membership');
      }

      const data = await response.json();
      setMembership(data.membership);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const cancelMembership = async () => {
    try {
      const response = await fetch('/api/membership/cancel', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel membership');
      }

      const data = await response.json();
      setMembership(data.membership);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshMembership = () => {
    fetchMembership();
  };

  return {
    membership,
    loading,
    error,
    updateMembership,
    extendMembership,
    cancelMembership,
    refreshMembership
  };
};
