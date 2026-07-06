import React, { useState, useEffect } from 'react';
import { database, auth } from '../firebase';
import { ref as dbRef, onValue, remove } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Certificate from './Certificate';
import useLanguage from '../hooks/useLanguage';

const AdminPanel = ({ onBack }) => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return; // Only fetch if logged in

    const leaderboardRef = dbRef(database, 'leaderboard');
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sortedEntries = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.score - a.score);
        
        setEntries(sortedEntries);
      } else {
        setEntries([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError(t('loginError'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`${t('deleteConfirm')} ${name}?`)) {
      try {
        await remove(dbRef(database, `leaderboard/${id}`));
      } catch (error) {
        console.error("Error deleting entry:", error);
        alert("An error occurred while deleting the entry.");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Brak daty';
    return new Date(timestamp).toLocaleString('pl-PL');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>{t('adminTitle')}</h2>
        <div>
          {user && <button className="btn-secondary" style={{ marginRight: '10px' }} onClick={handleLogout}>Wyloguj</button>}
          <button className="btn-secondary" onClick={onBack}>{t('backToMenu')}</button>
        </div>
      </div>

      {!user ? (
        <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
          <h3>{t('login')}</h3>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.8rem', fontSize: '1.2rem', border: '3px solid var(--neo-black)', borderRadius: '8px' }}
              required 
            />
            <input 
              type="password" 
              placeholder={t('password')} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.8rem', fontSize: '1.2rem', border: '3px solid var(--neo-black)', borderRadius: '8px' }}
              required 
            />
            {loginError && <div style={{ color: 'var(--neo-pink)', fontWeight: 'bold' }}>{loginError}</div>}
            <button type="submit" className="btn-primary">{t('login')}</button>
          </form>
        </div>
      ) : (
        <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Miejsce</th>
              <th>Nick</th>
              <th>Wynik</th>
              <th>Data</th>
              <th>Zgoda</th>
              <th>Certyfikat</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>{t('noEntries')}</td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id}>
                  <td>#{index + 1}</td>
                  <td><strong>{entry.name}</strong></td>
                  <td><span className="admin-score">{entry.score}</span></td>
                  <td className="admin-date">{formatDate(entry.timestamp)}</td>
                  <td>
                    {entry.consentGiven ? (
                      <span style={{ color: 'var(--neo-green)', fontWeight: 'bold' }}>✅ TAK</span>
                    ) : (
                      <span style={{ color: 'var(--neo-pink)', fontWeight: 'bold' }}>❌ NIE</span>
                    )}
                  </td>
                  <td>
                    {entry.photoUrl ? (
                      <div 
                        onClick={() => setSelectedCert(entry)} 
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        title="Pokaż pełny certyfikat"
                      >
                        <img src={entry.photoUrl} alt={`Certyfikat ${entry.name}`} className="admin-photo-thumb" />
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{t('noPhoto')}</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(entry.id, entry.name)}
                      title={t('delete')}
                    >
                      🗑️ {t('delete')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      )}

      {selectedCert && (
        <Certificate 
          name={selectedCert.name}
          score={selectedCert.score}
          uploadedPhotoUrl={selectedCert.photoUrl}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
