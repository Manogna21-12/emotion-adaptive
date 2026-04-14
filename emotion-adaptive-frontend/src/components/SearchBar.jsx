import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        apiService.search(query).then(res => {
          if (res.success) setResults(res.data);
        }).catch(console.error);
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div style={{ position: 'relative', width: '300px' }}>
      <input 
        type="text" 
        placeholder="Search quizzes, videos..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
      />
      
      {results && (results.quizzes.length > 0 || results.videos.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '8px', zIndex: 50, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          {results.quizzes.map(q => (
            <div key={q._id} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
               <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>QUIZ</span>
               <div style={{ fontWeight: '500' }}>{q.title}</div>
            </div>
          ))}
          {results.videos.map(v => (
            <div key={v._id} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
               <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>VIDEO</span>
               <div style={{ fontWeight: '500' }}>{v.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
