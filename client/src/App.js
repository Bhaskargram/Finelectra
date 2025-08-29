import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// --- ICONS: Added Building2, FileText for new settings ---
import { ChevronLeft, CheckCircle, User, Lock, Shield, LogOut, Users, UserPlus, BarChart2, Play, StopCircle, Award, Image as ImageIcon, QrCode, RefreshCw, Settings, Trash2, Tag, Upload, BookOpen, XCircle, Download, Archive, Edit, Menu, Vote, Maximize, ShieldOff, ShieldCheck, Activity, HeartPulse, Tv2, AlertTriangle, UserCheck, UserX, ArrowLeft, ArrowRight, Building2, FileText } from 'lucide-react';

const API_URL = ''; // This MUST be an empty string for Firebase deployment

// --- Core Components (Card, Button, Input, Header) ---
const GlobalStyle = () => (
    <style>{`
        @keyframes spin-text {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
        .spin-text-animation {
            display: inline-block;
            animation: spin-text 5s linear infinite;
            transform-style: preserve-3d;
        }
        @keyframes autoscroll {
            from { transform: translateY(0); }
            to { transform: translateY(-50%); }
        }
        .animate-scroll {
            animation: autoscroll var(--scroll-duration, 50s) linear infinite;
        }
    `}</style>
);
const Card = ({ children, className = '' }) => <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 w-full ${className}`}>{children}</div>;
const Button = ({ children, onClick, className = '', variant = 'primary', type = 'button', disabled = false }) => {
    const variants = { primary: 'bg-slate-800 text-white hover:bg-slate-900', secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300', danger: 'bg-red-600 text-white hover:bg-red-700', success: 'bg-green-600 text-white hover:bg-green-700' };
    return <button type={type} onClick={onClick} className={`font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-500/50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}</button>;
};
const Input = ({ id, type, placeholder, value, onChange, icon }) => <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">{icon}</span><input id={id} type={type} placeholder={placeholder} value={value} onChange={onChange} className="w-full pl-10 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" required /></div>;
const Header = ({ title, onBack, showBack }) => <div className="relative flex items-center justify-center mb-6 h-12">{showBack && <button onClick={onBack} className="absolute left-0 p-2 text-slate-600 hover:text-slate-900"><ChevronLeft size={28} /></button>}<h1 className="text-2xl font-bold text-slate-800">{title}</h1></div>;

// --- API Helper Hook (Updated with polling capability) ---
function useApi(url, pollInterval = 0) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api${url}`, { headers: { 'x-auth-token': token } });
            if (!res.ok) throw new Error('Failed to fetch data');
            const jsonData = await res.json();
            setData(jsonData);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    
    useEffect(() => {
        fetchData();
        if (pollInterval > 0) {
            const intervalId = setInterval(fetchData, pollInterval);
            return () => clearInterval(intervalId);
        }
    }, [url, pollInterval]);
    
    return { data, loading, error, refetch: fetchData };
}

// --- Login Screen ---
// MODIFIED: Added appName prop to display the custom application title
function LoginScreen({ onLogin, logoUrl, secondaryLogoUrl, appName }) { 
    const [role, setRole] = useState('voter');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setIsLoading(true);
        const url = role === 'voter' ? `${API_URL}/api/auth/voter-login` : `${API_URL}/api/auth/admin-login`;
        const body = role === 'voter' ? { voterId: identifier, password } : { username: identifier, password };
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || 'Login failed');
            localStorage.setItem('token', data.token);
            onLogin(data.user);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    return <div className="max-w-md mx-auto"><Card><div className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 h-12 mb-4">
            <img src={logoUrl || 'https://placehold.co/150x50/E0E0E0/333?text=Logo+1'} alt="Election Logo" className="h-full w-auto object-contain" onError={(e) => e.target.style.display='none'} />
            {secondaryLogoUrl && <img src={secondaryLogoUrl} alt="Secondary Logo" className="h-full w-auto object-contain" onError={(e) => e.target.style.display='none'} />}
        </div>
        {/* MODIFIED: Using appName prop */}
        <h1 className="text-3xl font-bold text-slate-900">{appName ? `${appName} Portal` : 'Finelectra Portal'}</h1><p className="text-slate-500 mt-2">Please sign in to continue</p></div><div className="flex bg-slate-200 rounded-lg p-1 mb-6"><button onClick={() => setRole('voter')} className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${role === 'voter' ? 'bg-white shadow' : 'text-slate-600'}`}>Voter / Monitor</button><button onClick={() => setRole('admin')} className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${role === 'admin' ? 'bg-white shadow' : 'text-slate-600'}`}>Admin</button></div><form onSubmit={handleSubmit} className="space-y-4"><Input id="identifier" type="text" placeholder={role === 'voter' ? 'Voter ID' : 'Admin Username'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} icon={role === 'voter' ? <User size={20} /> : <Shield size={20} />} /><Input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={20} />} />{error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}<div className="pt-4"><Button type="submit" variant="primary" className="w-full" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign In'}</Button></div></form></Card></div>;
}


// --- Admin Dashboard Components ---
const AlertPopup = ({ message, icon, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-2xl flex items-center gap-3 ${color}`}
    >
        {icon}
        <span className="font-semibold">{message}</span>
    </motion.div>
);

function LiveDashboard() {
    const { data: stats, loading } = useApi('/admin/live-stats', 5000);
    const [alerts, setAlerts] = useState([]);
    const prevMonitorsRef = useRef([]);

    useEffect(() => {
        if (stats) {
            const currentMonitors = stats.activeMonitors || [];
            const prevMonitors = prevMonitorsRef.current;
            const offlineMonitors = prevMonitors.filter(m => !currentMonitors.includes(m));
            offlineMonitors.forEach(monitorName => {
                addAlert(`${monitorName} went offline!`, <UserX size={20} />, 'bg-yellow-400 text-yellow-900');
            });
            const onlineMonitors = currentMonitors.filter(m => !prevMonitors.includes(m));
            onlineMonitors.forEach(monitorName => {
                addAlert(`${monitorName} is online.`, <UserCheck size={20} />, 'bg-green-400 text-green-900');
            });
            (stats.newInvalidScans || []).forEach(scan => {
                addAlert(`Invalid QR scan by ${scan.monitorName}!`, <AlertTriangle size={20} />, 'bg-red-500 text-white');
            });
            (stats.newUsedScans || []).forEach(scan => {
                addAlert(`Used QR scan by ${scan.monitorName}!`, <AlertTriangle size={20} />, 'bg-orange-500 text-white');
            });
            prevMonitorsRef.current = currentMonitors;
        }
    }, [stats]);

    const addAlert = (message, icon, color) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, message, icon, color }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 5000);
    };

    if (loading && !stats) return <Card><p className="text-center">Loading Live Data...</p></Card>;

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Live Election Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center">
                    <Vote size={40} className="mx-auto text-slate-500 mb-3" />
                    <p className="text-5xl font-bold">{stats?.totalVotes ?? 0}</p>
                    <p className="text-slate-600 font-semibold">Total Votes Cast</p>
                </Card>
                <Card className="text-center">
                    <HeartPulse size={40} className="mx-auto text-slate-500 mb-3" />
                    <p className="text-5xl font-bold">{stats?.activeMonitors?.length ?? 0}</p>
                    <p className="text-slate-600 font-semibold">Active Monitors</p>
                </Card>
                <Card className="text-center">
                    <Activity size={40} className="mx-auto text-slate-500 mb-3" />
                    <p className="text-2xl font-bold text-green-600">SYSTEM STABLE</p>
                    <p className="text-slate-600 font-semibold">Status</p>
                </Card>
            </div>
            <div className="mt-6">
                <Card>
                    <h3 className="text-lg font-bold mb-3">Active Monitor Stations</h3>
                    {stats?.activeMonitors && stats.activeMonitors.length > 0 ? (
                        <ul className="space-y-2">
                            {stats.activeMonitors.map(name => (
                                <li key={name} className="flex items-center gap-3 p-2 bg-green-50 text-green-800 rounded-lg">
                                    <UserCheck size={18} /> <span className="font-semibold">{name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500">No monitors are currently active.</p>
                    )}
                </Card>
            </div>
             <AnimatePresence>
                {alerts.map(alert => (
                    <AlertPopup key={alert.id} {...alert} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function MonitorTracking() {
    const { data, loading } = useApi('/admin/monitor-details', 10000);

    if (loading && !data) return <Card><p className="text-center">Loading Monitor Details...</p></Card>;

    const getStatusChip = (status) => {
        switch (status) {
            case 'valid': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Valid</span>;
            case 'invalid_token': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Invalid</span>;
            case 'already_used': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Used</span>;
            default: return null;
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Monitor Tracking</h2>
            <div className="mb-6">
                <Card>
                    <h3 className="text-lg font-bold mb-3">Active Monitor Stations ({data?.activeMonitors?.length ?? 0})</h3>
                    {data?.activeMonitors && data.activeMonitors.length > 0 ? (
                        <ul className="space-y-2">
                            {data.activeMonitors.map(name => (
                                <li key={name} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                    <UserCheck size={18} className="text-green-600"/> <span className="font-semibold">{name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500">No monitors are currently active.</p>
                    )}
                </Card>
            </div>
            <Card>
                <h3 className="text-lg font-bold mb-3">Recent Scan Activity (Last 100)</h3>
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3">Monitor</th>
                                <th scope="col" className="px-4 py-3">Status</th>
                                <th scope="col" className="px-4 py-3">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.scanLogs || []).map(log => (
                                <tr key={log._id} className="border-b">
                                    <td className="px-4 py-2 font-medium">{log.monitorName}</td>
                                    <td className="px-4 py-2">{getStatusChip(log.status)}</td>
                                    <td className="px-4 py-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function ManageVoters() {
    const { data: voters, loading, refetch } = useApi('/admin/voters');
    const [voterID, setVoterID] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [editingVoter, setEditingVoter] = useState(null);

    const resetForm = () => {
        setVoterID('');
        setName('');
        setPassword('');
        setEditingVoter(null);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingVoter 
            ? `${API_URL}/api/admin/voters/${editingVoter._id}` 
            : `${API_URL}/api/admin/voters`;
        const method = editingVoter ? 'PUT' : 'POST';
        
        const body = { voterID, name };
        if (password) {
            body.password = password;
        }

        await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, 
            body: JSON.stringify(body) 
        });
        
        resetForm();
        refetch();
    };

    const handleEditClick = (voter) => {
        setEditingVoter(voter);
        setVoterID(voter.voterID);
        setName(voter.name);
        setPassword('');
    };
    
    const handleDeleteClick = async (voterId) => {
        if (window.confirm("Are you sure you want to delete this voter?")) {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/admin/voters/${voterId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            refetch();
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">{editingVoter ? 'Edit Voter' : 'Add Voter'}</h2>
            <Card className="mb-6">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input id="voterID" placeholder="Voter ID" value={voterID} onChange={e => setVoterID(e.target.value)} icon={<User size={18}/>} />
                    <Input id="name" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} icon={<User size={18}/>} />
                    <Input id="password" type="password" placeholder={editingVoter ? "New Password (optional)" : "Password"} value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={18}/>} />
                    <div className="flex gap-4">
                        <Button className="w-full" type="submit" variant={editingVoter ? 'success' : 'primary'}>
                            {editingVoter ? 'Update Voter' : 'Add Voter'}
                        </Button>
                        {editingVoter && <Button className="w-full" variant="secondary" onClick={resetForm}>Cancel</Button>}
                    </div>
                </form>
            </Card>
            <Card>
                <h3 className="text-lg font-bold mb-3">Existing Voters</h3>
                {loading && <p>Loading voters...</p>}
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {(voters || []).map(v => (
                        <li key={v._id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span>{v.name} ({v.voterID})</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditClick(v)} className="p-1 text-slate-600 hover:text-slate-900"><Edit size={16}/></button>
                                <button onClick={() => handleDeleteClick(v._id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}

function ManageCandidates({ positions }) {
    const { data: candidates, loading, refetch } = useApi('/admin/candidates');
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState('');
    const [position, setPosition] = useState('');
    const [editingCandidate, setEditingCandidate] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => { if (positions.length > 0 && !position) setPosition(positions[0].name); }, [positions, position]);
    
    const resetForm = () => {
        setName('');
        setPhoto('');
        if (positions.length > 0) setPosition(positions[0].name);
        setEditingCandidate(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhoto(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingCandidate 
            ? `${API_URL}/api/admin/candidates/${editingCandidate._id}` 
            : `${API_URL}/api/admin/candidates`;
        const method = editingCandidate ? 'PUT' : 'POST';
        
        const body = { name, position };
        if (photo && photo.startsWith('data:image')) {
            body.photo = photo;
        }

        await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, 
            body: JSON.stringify(body) 
        });
        
        resetForm();
        refetch();
    };

    const handleEditClick = (candidate) => {
        setEditingCandidate(candidate);
        setName(candidate.name);
        setPosition(candidate.position);
        setPhoto(candidate.photo);
    };
    
    const handleDeleteClick = async (candidateId) => {
        if (window.confirm("Are you sure you want to delete this candidate?")) {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/admin/candidates/${candidateId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            refetch();
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">{editingCandidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
            <Card className="mb-6">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input id="name" placeholder="Candidate Name" value={name} onChange={e => setName(e.target.value)} icon={<User size={18}/>} />
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Award size={18}/></span>
                        <select id="position" value={position} onChange={e => setPosition(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                            {(positions || []).map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <label htmlFor="photo-upload" className="w-full font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-500/50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider bg-slate-200 text-slate-800 hover:bg-slate-300 cursor-pointer">
                            <Upload size={16}/> {photo ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        <input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    </div>
                    {photo && !photo.startsWith('data:image') && <img src={photo} alt="Current" className="w-24 h-24 rounded-full mx-auto object-cover"/>}
                    <div className="flex gap-4">
                        <Button className="w-full" type="submit" variant={editingCandidate ? 'success' : 'primary'}>
                            {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                        </Button>
                        {editingCandidate && <Button className="w-full" variant="secondary" onClick={resetForm}>Cancel</Button>}
                    </div>
                </form>
            </Card>
            <Card>
                <h3 className="text-lg font-bold mb-3">Existing Candidates</h3>
                {loading && <p>Loading candidates...</p>}
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {(candidates || []).map(c => (
                        <li key={c._id} className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-4">
                                <img src={c.photo || `https://placehold.co/40x40/E0E0E0/333?text=${c.name.charAt(0)}`} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="font-semibold">{c.name}</p>
                                    <p className="text-sm text-slate-500 capitalize">{c.position}</p>
                                </div>
                            </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleEditClick(c)} className="p-1 text-slate-600 hover:text-slate-900"><Edit size={16}/></button>
                                <button onClick={() => handleDeleteClick(c._id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}

function AnimatedBar({ value, maxValue }) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        requestAnimationFrame(() => setWidth(percentage));
    }, [value, maxValue]);
    return <div className="w-full bg-slate-200 rounded-full h-4"><div className="bg-slate-600 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%` }}></div></div>;
}
function ViewResults({ electionStatus }) {
    const { data: results, loading } = useApi('/admin/results');
    const [viewState, setViewState] = useState('idle');
    const [countdown, setCountdown] = useState(20);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        let timer;
        if (viewState === 'branding') {
            timer = setTimeout(() => setViewState('countdown'), 5000);
        } else if (viewState === 'countdown') {
            if (countdown > 0) {
                timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
            } else {
                setViewState('results');
            }
        }
        return () => { clearTimeout(timer); clearInterval(timer); };
    }, [viewState, countdown]);

    const handleShowResults = () => {
        setViewState('branding');
        setCountdown(20);
        setCurrentSlide(0);
    };

    if (!electionStatus?.resultsPublished) {
        return <Card><p className="text-center font-semibold">Results have not been published yet.</p></Card>;
    }
    
    if (viewState === 'idle') {
        return <Card><Button className="w-full" onClick={handleShowResults}><BarChart2 size={16}/> Show Results</Button></Card>;
    }

    const groupedResults = (results || []).reduce((acc, candidate) => {
        (acc[candidate.position] = acc[candidate.position] || []).push(candidate);
        return acc;
    }, {});
    for (const position in groupedResults) {
        groupedResults[position].sort((a, b) => b.votes - a.votes);
    }
    const positions = Object.keys(groupedResults);
    const currentPositionData = groupedResults[positions[currentSlide]];

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % positions.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + positions.length) % positions.length);

    return (
        <div className="relative">
            <AnimatePresence>
                {viewState === 'branding' && (
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0, scale: 0 }} transition={{ duration: 1, ease: "easeInOut" }} className="text-center p-10">
                        <h2 className="text-4xl font-bold text-slate-800">This software developed by</h2>
                        <h1 className="text-6xl font-extrabold text-slate-900 mt-4">Finixia dedecons</h1>
                    </motion.div>
                )}
                {viewState === 'countdown' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center p-10">
                        <h2 className="text-3xl font-semibold text-slate-700 mb-4">Results will appear in...</h2>
                        <p className="text-9xl font-bold text-slate-900">{countdown}</p>
                    </motion.div>
                )}
                {viewState === 'results' && !loading && positions.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h2 className="text-xl font-bold mb-4">Election Results</h2>
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={currentSlide}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card>
                                    <h3 className="text-lg font-bold capitalize mb-4">{positions[currentSlide]}</h3>
                                    <ul className="space-y-4">
                                        {currentPositionData.map((c, index) => {
                                            const maxVotes = Math.max(...currentPositionData.map(c => c.votes), 0);
                                            return (
                                                <li key={c._id} className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img src={c.photo || `https://placehold.co/40x40/E0E0E0/333?text=${c.name.charAt(0)}`} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                                                        {index === 0 && c.votes > 0 && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg">WINNER</motion.div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-semibold">{c.name}</span>
                                                            <span className="font-bold">{c.votes} Votes</span>
                                                        </div>
                                                        <AnimatedBar value={c.votes} maxValue={maxVotes} />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                         <div className="flex justify-between mt-4">
                            <Button onClick={prevSlide} variant="secondary"><ArrowLeft size={16}/> Previous</Button>
                            <Button onClick={nextSlide} variant="secondary">Next <ArrowRight size={16}/></Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {loading && viewState === 'results' && <p>Loading results...</p>}
        </div>
    );
}

// NEW: AppSettings component updated with new editable fields
function AppSettings({ config, refetchConfig }) {
    const [newAppTitle, setNewAppTitle] = useState(config.appTitle || 'Finelectra');
    const [newLogoUrl, setNewLogoUrl] = useState(config.logoUrl);
    const [newSecondaryLogoUrl, setNewSecondaryLogoUrl] = useState(config.secondaryLogoUrl || '');
    const [newQrIconUrl, setNewQrIconUrl] = useState(config.qrIconUrl);
    const [newCollegeName, setNewCollegeName] = useState(config.collegeName || '');
    const [newCollegeLogoUrl, setNewCollegeLogoUrl] = useState(config.collegeLogoUrl || '');
    const { data: positions, loading, refetch: refetchPositions } = useApi('/admin/positions');
    const [newPosition, setNewPosition] = useState('');

    const handleUpdateSetting = async (key, value) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/admin/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ key, value }) });
        refetchConfig();
    };
    
    const handleAddPosition = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/admin/positions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ name: newPosition }) });
        setNewPosition('');
        refetchPositions();
        refetchConfig();
    };

    const handleDeletePosition = async (id) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/admin/positions/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        refetchPositions();
        refetchConfig();
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Application Settings</h2>
            <Card className="mb-6">
                <h3 className="text-lg font-semibold mb-3">General Branding</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input id="appTitle" placeholder="Application Title" value={newAppTitle} onChange={e => setNewAppTitle(e.target.value)} icon={<FileText size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('appTitle', newAppTitle)}>Save</Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input id="logoUrl" placeholder="Primary Logo URL" value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} icon={<ImageIcon size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('logoUrl', newLogoUrl)}>Save</Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input id="secondaryLogoUrl" placeholder="Secondary Logo URL" value={newSecondaryLogoUrl} onChange={e => setNewSecondaryLogoUrl(e.target.value)} icon={<ImageIcon size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('secondaryLogoUrl', newSecondaryLogoUrl)}>Save</Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input id="qrIconUrl" placeholder="QR Scanner Icon URL (512x512)" value={newQrIconUrl} onChange={e => setNewQrIconUrl(e.target.value)} icon={<QrCode size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('qrIconUrl', newQrIconUrl)}>Save</Button>
                    </div>
                </div>
            </Card>

            <Card className="mb-6">
                <h3 className="text-lg font-semibold mb-3">PDF Header Settings</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input id="collegeName" placeholder="College Name (for PDF Header)" value={newCollegeName} onChange={e => setNewCollegeName(e.target.value)} icon={<Building2 size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('collegeName', newCollegeName)}>Save</Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input id="collegeLogoUrl" placeholder="College Logo URL (for PDF Header)" value={newCollegeLogoUrl} onChange={e => setNewCollegeLogoUrl(e.target.value)} icon={<ImageIcon size={18}/>} />
                        <Button onClick={() => handleUpdateSetting('collegeLogoUrl', newCollegeLogoUrl)}>Save</Button>
                    </div>
                </div>
            </Card>
            
            <Card className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Controls</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-semibold">Emergency Logout Button</span>
                        <Button 
                            onClick={() => handleUpdateSetting('emergencyLogoutEnabled', !config.emergencyLogoutEnabled)}
                            variant={config.emergencyLogoutEnabled ? 'danger' : 'success'}
                            className="w-40"
                        >
                            {config.emergencyLogoutEnabled ? <><ShieldOff size={16}/> Disable</> : <><ShieldCheck size={16}/> Enable</>}
                        </Button>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-semibold">Fullscreen Button</span>
                         <Button 
                            onClick={() => handleUpdateSetting('fullscreenButtonEnabled', !config.fullscreenButtonEnabled)}
                            variant={config.fullscreenButtonEnabled ? 'danger' : 'success'}
                            className="w-40"
                        >
                            {config.fullscreenButtonEnabled ? <><ShieldOff size={16}/> Hide</> : <><ShieldCheck size={16}/> Show</>}
                        </Button>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="font-semibold">Public Results Screen</span>
                         <Button 
                            onClick={() => handleUpdateSetting('publicScreenEnabled', !config.publicScreenEnabled)}
                            variant={config.publicScreenEnabled ? 'danger' : 'success'}
                            className="w-40"
                        >
                            {config.publicScreenEnabled ? <><Tv2 size={16}/> Disable</> : <><Tv2 size={16}/> Enable</>}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-3">Candidate Positions</h3>
                <form onSubmit={handleAddPosition} className="flex items-center gap-4 mb-4">
                    <Input id="newPosition" placeholder="New Position Name" value={newPosition} onChange={e => setNewPosition(e.target.value)} icon={<Tag size={18}/>} />
                    <Button type="submit">Add</Button>
                </form>
                {loading ? <p>Loading...</p> : <ul className="space-y-2">{(positions || []).map(p => <li key={p._id} className="flex justify-between items-center p-2 bg-slate-50 rounded"><span>{p.name}</span><button onClick={() => handleDeletePosition(p._id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16}/></button></li>)}</ul>}
            </Card>
        </div>
    );
}

function UserManual() {
    return <div><h2 className="text-xl font-bold mb-4">Admin Panel: User Manual</h2><Card className="prose prose-sm max-w-none"><h3>1. Initial Login</h3><p>Select the <strong>"Admin"</strong> tab and enter the credentials from your <code>.env</code> file.</p><h3>2. Step-by-Step Election Workflow</h3><h4>Step 1: Configure Settings</h4><p>Go to the <strong>"Settings"</strong> tab. Set your application title, logo URLs, and QR icon. NEW: Set the College Name and Logo for PDF downloads. Create all necessary candidate positions and configure monitor station controls.</p><h4>Step 2: Add Voters and Candidates</h4><p>Go to the <strong>"Voters"</strong> and <strong>"Candidates"</strong> tabs to add all participants. You can edit or delete any entry after it has been created using the icons next to each name.</p><h4>Step 3: Generate QR Codes</h4><p>Navigate to the <strong>"Election Control"</strong> tab. Enter the number of QR codes you need and click <strong>"Generate & Download PDF"</strong>. You can do this before or during an active election to add more voters.</p><h4>Step 4: Run the Election</h4><p>On the Election Control tab, click <strong>"Start Election"</strong>. Monitors can now log in at polling stations.</p><h4>Step 5: Monitor the Election</h4><p>Use the <strong>"Live Dashboard"</strong> to see votes in real-time and monitor station status. Use the <strong>"Monitor Tracking"</strong> page for detailed scan logs.</p><h4>Step 6: Access Public Screen</h4><p>Click the <strong>"Public Screen"</strong> button in the navigation menu to open the live results display in a new tab. This is meant for a large projector or TV screen for public viewing. It only works if enabled in Settings.</p><h4>Step 7: Publish and View Results</h4><p>After the election ends (by clicking <strong>"Stop Election"</strong>), a <strong>"Publish Results"</strong> button will appear. Click it, then go to the <strong>"Results"</strong> tab and click <strong>"Show Results"</strong>.</p><h4>Step 8: Start a New Election</h4><p>Once results are published, a <strong>"Start New Election"</strong> button appears. This will wipe all previous votes and QR codes and archive the results.</p><h3>Polling Station Monitor Instructions</h3><p>Log in using the "Voter / Monitor" tab. The screen will show the QR scanner. If visible, press the fullscreen button to prevent accidental clicks. The logout button is hidden during an active election unless enabled remotely by an admin for emergencies.</p></Card></div>;
}

function ArchivedResults() {
    const { data: archivedResults, loading, error } = useApi('/admin/archived-results');

    if (loading && !archivedResults) return <Card><p className="text-center">Fetching archived results...</p></Card>;
    if (error) return <Card><p className="text-red-500">Error: {error}</p></Card>;
    if (!archivedResults || archivedResults.length === 0) return <Card><p className="text-center">No archived results found.</p></Card>;

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Archived Election Results</h2>
            <div className="space-y-6">
                {(archivedResults || []).map(archive => {
                    const groupedResults = archive.results.reduce((acc, candidate) => {
                        (acc[candidate.position] = acc[candidate.position] || []).push(candidate);
                        return acc;
                    }, {});

                    return (
                        <Card key={archive._id}>
                            <h3 className="text-lg font-bold mb-3">Election Year: {archive.year}</h3>
                            {Object.keys(groupedResults).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(groupedResults).map(([positionName, candidates]) => (
                                        <div key={positionName} className="mb-4">
                                            <h4 className="font-semibold text-slate-700 capitalize">{positionName}</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {candidates.sort((a, b) => b.votes - a.votes).map(c => (
                                                    <li key={c._id || c.name}>{c.name}: {c.votes} votes</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No results recorded for this year.</p>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// NEW: ElectionControl updated with clearer text for QR Generation
function ElectionControl({ electionConfig, refetchElectionStatus }) {
    const [qrCount, setQrCount] = useState(100);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleStatusChange = async (status, resultsPublished = electionConfig.election.resultsPublished) => {
        if (status === 'Finished') {
            if (!window.confirm("Are you sure you want to end the election? No more votes can be cast.")) {
                return;
            }
        }
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/admin/election/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ status, resultsPublished }) });
        refetchElectionStatus();
    };

    const handleGeneratePdf = async () => {
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('token');
            // MODIFIED: Added electionStatus to the request to handle new QR codes during an active election
            const res = await fetch(`${API_URL}/api/admin/generate-qrcodes?count=${qrCount}&electionStatus=${electionConfig.election?.status}`, { headers: { 'x-auth-token': token } });
            if (!res.ok) throw new Error('PDF Generation failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `qrcodes_${qrCount}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) { console.error("Download error:", error); alert("Failed to download PDF."); } finally { setIsDownloading(false); }
    };
    
    const handleResetElection = async () => {
        if (window.confirm("Are you sure? This will delete all current votes, QR codes, and scan logs, and will archive the current results.")) {
            setIsResetting(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/admin/election/reset`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token } 
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ msg: 'An unknown error occurred on the server.' }));
                    throw new Error(errorData.msg || 'Failed to reset election');
                }
                await refetchElectionStatus();
            } catch (error) { 
                console.error("Reset error:", error); 
                alert(`Failed to start new election: ${error.message}`); 
            } finally { 
                setIsResetting(false); 
            }
        }
    };

    const handleDownloadPublishedResults = async () => {
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/admin/results/published-download`, { headers: { 'x-auth-token': token } });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ msg: 'An unknown error occurred during PDF generation.' }));
                throw new Error(errorData.msg || 'Failed to download published results PDF');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `official_election_results_${new Date().getFullYear()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download published results error:", error);
            alert(`Failed to download published results PDF: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Election Control</h2>
            <Card className="mb-6">
                <p className="text-center mb-4">Current Status: <span className="font-bold text-lg">{electionConfig.election?.status}</span></p>
                <div className="space-y-2">
                    {electionConfig.election?.status === 'Pending' && <Button onClick={() => handleStatusChange('Active')} variant="success" className="w-full"><Play size={16}/> Start Election</Button>}
                    {electionConfig.election?.status === 'Active' && <Button onClick={() => handleStatusChange('Finished')} variant="danger" className="w-full"><StopCircle size={16}/> Stop Election</Button>}
                    {electionConfig.election?.status === 'Finished' && !electionConfig.election.resultsPublished && <Button onClick={() => handleStatusChange('Finished', true)} variant="primary" className="w-full"><Award size={16}/> Publish Results</Button>}
                    {electionConfig.election?.resultsPublished && (
                        <div className="space-y-4">
                            <p className="text-center text-green-600 font-semibold">Results are now public.</p>
                            <Button onClick={handleDownloadPublishedResults} variant="secondary" className="w-full" disabled={isDownloading}>{isDownloading ? 'Downloading...' : <><Download size={16}/> Download Published Results PDF</>}</Button>
                            <Button onClick={handleResetElection} variant="danger" className="w-full" disabled={isResetting}>{isResetting ? 'Resetting...' : <><RefreshCw size={16}/> Start New Election</>}</Button>
                        </div>
                    )}
                </div>
            </Card>
            <h2 className="text-xl font-bold my-4">QR Code Management</h2>
            <Card>
                {/* MODIFIED: Added clearer text to indicate QR codes can be generated mid-election */}
                <p className="text-slate-600 mb-4">
                    Generate unique QR codes for voters. 
                    <span className="font-semibold block text-sm mt-1">You can generate additional codes even after the election has started.</span>
                </p>
                <div className="flex items-center gap-4 mb-4">
                    <Input id="qrCount" type="number" placeholder="e.g., 100" value={qrCount} onChange={e => setQrCount(e.target.value)} icon={<QrCode size={18}/>} />
                </div>
                <Button onClick={handleGeneratePdf} variant="secondary" className="w-full" disabled={isDownloading}>{isDownloading ? 'Generating...' : <><UserPlus size={16}/> Generate & Download PDF</>}</Button>
            </Card>
        </div>
    );
}

// NEW: AdminDashboard with scrollable menu
function AdminDashboard({ user, onLogout, electionConfig, refetchElectionStatus }) {
    const [page, setPage] = useState('live-dashboard');
    const [showMenu, setShowMenu] = useState(false);

    const renderAdminPage = () => {
        switch(page) {
            case 'live-dashboard': return <LiveDashboard />;
            case 'monitor-tracking': return <MonitorTracking />;
            case 'election-control': return <ElectionControl electionConfig={electionConfig} refetchElectionStatus={refetchElectionStatus} />;
            case 'voters': return <ManageVoters />;
            case 'candidates': return <ManageCandidates positions={electionConfig.positions || []} />;
            case 'results': return <ViewResults electionStatus={electionConfig.election} />;
            case 'settings': return <AppSettings config={electionConfig} refetchConfig={refetchElectionStatus} />;
            case 'manual': return <UserManual />;
            case 'archive': return <ArchivedResults />;
            default: return <LiveDashboard />;
        }
    };

    const NavButton = ({ pageName, icon, children, onClick }) => (
         <button onClick={() => { if(onClick) { onClick(); } else { setPage(pageName); } setShowMenu(false); }} className={`w-full text-left p-3 rounded-lg hover:bg-slate-100 font-semibold flex items-center gap-3 transition-colors ${page === pageName ? 'bg-slate-200' : ''}`}>
            {icon} {children}
        </button>
    );

    return (
        <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8">
            <header className="flex justify-between items-center py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button className="md:hidden p-2 text-slate-600 hover:text-slate-900" onClick={() => setShowMenu(!showMenu)}><Menu size={28} /></button>
                    {/* MODIFIED: Using custom app title */}
                    <h1 className="text-2xl md:text-3xl font-bold">{electionConfig.appTitle ? `${electionConfig.appTitle} Admin` : 'Finelectra Admin Panel'}</h1>
                </div>
                <Button onClick={onLogout} variant="secondary"><LogOut size={16}/> Logout</Button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                {/* MODIFIED: Added classes for scrollable menu on desktop */}
                <aside className={`fixed inset-y-0 left-0 bg-white z-40 w-64 p-6 shadow-xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:col-span-1 md:bg-transparent md:p-0 md:shadow-none ${showMenu ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-full md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:pr-2">
                        <Card className="md:p-0 md:bg-transparent md:shadow-none">
                            <div className="flex justify-between items-center mb-6 md:hidden"><h2 className="text-xl font-bold">Menu</h2><button onClick={() => setShowMenu(false)} className="p-1 rounded-full hover:bg-slate-200"><XCircle size={24} /></button></div>
                            <nav className="space-y-2">
                                <NavButton pageName="live-dashboard" icon={<Activity size={18} />}>Live Dashboard</NavButton>
                                <NavButton pageName="monitor-tracking" icon={<UserCheck size={18} />}>Monitor Tracking</NavButton>
                                <NavButton pageName="election-control" icon={<BarChart2 size={18} />}>Election Control</NavButton>
                                <NavButton pageName="voters" icon={<Users size={18} />}>Voters</NavButton>
                                <NavButton pageName="candidates" icon={<Award size={18} />}>Candidates</NavButton>
                                <NavButton pageName="results" icon={<BarChart2 size={18} />}>Current Results</NavButton>
                                <NavButton pageName="archive" icon={<Archive size={18} />}>Archived Results</NavButton>
                                <NavButton pageName="settings" icon={<Settings size={18} />}>Settings</NavButton>
                                <NavButton pageName="manual" icon={<BookOpen size={18} />}>User Manual</NavButton>
                                <hr/>
                                <NavButton pageName="public-screen" icon={<Tv2 size={18}/>} onClick={() => window.open('/#/public', '_blank')}>Public Screen</NavButton>
                            </nav>
                        </Card>
                    </div>
                </aside>
                {showMenu && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setShowMenu(false)}></div>}
                <main className="md:col-span-3">{renderAdminPage()}</main>
            </div>
            <footer className="text-center text-slate-500 text-sm mt-8 py-4">
                <span className="spin-text-animation">{electionConfig.appTitle || 'Finelectra'} is developed by Finixia dedecons</span>
            </footer>
        </div>
    );
}

function MonitorScreen({ onLogout, isScriptLoaded, electionConfig, refetchConfig }) {
    const [page, setPage] = useState('scan');
    const [qrCodeId, setQrCodeId] = useState(null);
    const [error, setError] = useState('');
    const [scanStatus, setScanStatus] = useState('idle');
    const audioCtx = useRef(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };
    
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    await fetch(`${API_URL}/api/vote/heartbeat`, {
                        method: 'POST',
                        headers: { 'x-auth-token': token }
                    });
                }
            } catch (err) {
                console.error("Heartbeat failed:", err);
            }
        };
        sendHeartbeat();
        const intervalId = setInterval(sendHeartbeat, 45000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const initializeAudio = () => {
            if (!audioCtx.current) {
                audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
            }
        };
        document.body.addEventListener('click', initializeAudio, { once: true });
        return () => document.body.removeEventListener('click', initializeAudio);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => { refetchConfig(); }, 10000); 
        return () => clearInterval(interval);
    }, [refetchConfig]);
    
    const playSound = (isSuccess) => {
        if (!audioCtx.current || audioCtx.current.state === 'suspended') {
            audioCtx.current?.resume();
        }
        if (!audioCtx.current) return;

        const oscillator = audioCtx.current.createOscillator();
        const gainNode = audioCtx.current.createGain();
        oscillator.type = isSuccess ? 'sine' : 'square';
        oscillator.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.current.currentTime);
        if (!isSuccess) {
            oscillator.frequency.exponentialRampToValueAtTime(165, audioCtx.current.currentTime + 0.2);
        }
        gainNode.gain.setValueAtTime(0.25, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.current.destination);
        oscillator.start();
        oscillator.stop(audioCtx.current.currentTime + 0.3);
    };

    const handleScanSuccess = (qrId) => {
        setQrCodeId(qrId);
        setPage('vote');
        setScanStatus('success');
        playSound(true);
        setTimeout(() => setScanStatus('idle'), 1500);
    };
    
    const handleScanError = (msg) => {
        setError(msg);
        setScanStatus('error');
        playSound(false);
        setTimeout(() => {
            setError('');
            setPage('scan');
            setScanStatus('idle');
        }, 3000);
    };

    const handleVoteFinish = () => {
        setPage('thanks');
        setTimeout(() => {
            setPage('scan');
            setQrCodeId(null);
            setError('');
        }, 3000);
    };

    const renderContent = () => {
        switch (page) {
            case 'vote': return <VotingForm onVoteSubmit={handleVoteFinish} qrCodeId={qrCodeId} electionConfig={electionConfig} />;
            case 'thanks': return <ThankYouScreen />;
            case 'scan': default:
                return <QRScannerScreen onScanSuccess={handleScanSuccess} isScriptLoaded={isScriptLoaded} onError={handleScanError} scanStatus={scanStatus} qrIconUrl={electionConfig.qrIconUrl} />;
        }
    };

    const showLogoutButton = electionConfig.election.status !== 'Active' || electionConfig.emergencyLogoutEnabled;

    return (
        <div className="max-w-md mx-auto relative">
             {electionConfig.fullscreenButtonEnabled && (
                <div className="absolute -top-2 right-0 z-10">
                    <Button onClick={toggleFullScreen} variant="secondary" className="w-auto p-3 shadow-lg">
                        <Maximize size={18}/>
                    </Button>
                </div>
            )}
            
            {showLogoutButton && (
                 <div className="absolute -top-2 left-0 z-10">
                    <Button onClick={onLogout} variant="secondary" className="w-auto shadow-lg">
                        <LogOut size={16}/> Logout Monitor
                    </Button>
                </div>
            )}
            
            <div className="pt-12">
                {error && <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-4 animate-pulse"><XCircle size={24} /><p className="font-semibold">{error}</p></div>}
                {renderContent()}
                <footer className="text-center text-slate-500 text-sm mt-8">
                    <span className="spin-text-animation">{electionConfig.appTitle || 'Finelectra'} is developed by Finixia dedecons</span>
                </footer>
            </div>
        </div>
    );
}

function QRScannerScreen({ onScanSuccess, isScriptLoaded, onError, scanStatus, qrIconUrl }) {
    const scannerRef = useRef(null);

    const borderClasses = {
        idle: 'border-slate-200',
        success: 'border-green-500 shadow-lg shadow-green-500/50',
        error: 'border-red-500 shadow-lg shadow-red-500/50'
    };

    useEffect(() => {
        if (!isScriptLoaded || scannerRef.current || document.getElementById('qr-reader')?.innerHTML) return;
        const qrboxSize = window.innerWidth < 450 ? 250 : 350; 
        const scanner = new window.Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: qrboxSize, height: qrboxSize } }, false);
        
        const handleScan = async (decodedText) => {
            if (scannerRef.current?.getState() === 2) { // 2 is SCANNING state
                try {
                    scanner.pause(true);
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/vote/validate-qr`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ qrToken: decodedText }) });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.msg || 'QR validation failed');
                    onScanSuccess(data.qrCodeId);
                } catch (err) { 
                    onError(err.message); 
                    setTimeout(() => {
                        if (scannerRef.current?.getState() === 3) { // 3 is PAUSED state
                            scanner.resume();
                        }
                    }, 3000);
                }
            }
        };

        scanner.render(handleScan, (err) => {});
        scannerRef.current = scanner;
        
        return () => { 
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [isScriptLoaded, onScanSuccess, onError]);

    return (
        <Card>
            <div className="text-center">
                {qrIconUrl ? (
                    <img src={qrIconUrl} alt="QR Scanner Icon" className="mx-auto h-24 w-24 object-contain mb-2" onError={(e) => e.target.style.display='none'} />
                ) : (
                    <Vote size={48} className="mx-auto text-slate-700 mb-2" />
                )}
                <Header title="Scan QR Code" />
            </div>
            <p className="text-center text-slate-600 mb-4 -mt-6">Please scan the voter's unique QR code to begin.</p>
            {isScriptLoaded ? 
                <div id="qr-reader-container" className={`w-full max-w-[400px] mx-auto rounded-lg overflow-hidden border-8 transition-all duration-300 ${borderClasses[scanStatus]}`}>
                    <div id="qr-reader"></div>
                </div> 
                : 
                <div className="w-full h-[300px] flex items-center justify-center bg-slate-100 rounded-lg"><p>Loading Scanner...</p></div>
            }
        </Card>
    );
}

function VotingForm({ onVoteSubmit, qrCodeId, electionConfig }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const isReviewStep = currentStep === (electionConfig.positions || []).length;
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/vote/cast`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ qrCodeId, selections }) });
            if (!res.ok) { const data = await res.json(); throw new Error(data.msg || 'Failed to cast vote'); }
            onVoteSubmit();
        } catch (err) { alert(`Error: ${err.message}`); } finally { setIsLoading(false); }
    };
    if (isReviewStep) return <Card><Header title="Review Your Vote" onBack={() => setCurrentStep(currentStep - 1)} showBack={true} /><div className="space-y-4">{(electionConfig.positions || []).map(pos => { const candidate = (electionConfig.candidates || []).find(c => c._id === selections[pos.name]); return <div key={pos._id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center"><span className="font-bold text-slate-700">{pos.name}:</span><span className="text-slate-900">{candidate ? candidate.name : 'Not Selected'}</span></div>; })}</div><div className="mt-8"><Button className="w-full" onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Submitting...' : 'Confirm & Cast Vote'}</Button></div></Card>;
    const currentPosition = (electionConfig.positions || [])[currentStep];
    const candidatesForPosition = (electionConfig.candidates || []).filter(c => c.position === currentPosition.name);
    const handleSelect = (candidateId) => setSelections(prev => ({ ...prev, [currentPosition.name]: candidateId }));
    const handleNext = () => { if (selections[currentPosition.name]) setCurrentStep(currentStep + 1); };
    return <Card><Header title={`Vote for ${currentPosition.name}`} /><div className="space-y-4">{candidatesForPosition.map(c => <div key={c._id} onClick={() => handleSelect(c._id)} className={`p-4 border-2 rounded-lg flex items-center gap-4 cursor-pointer transition-all ${selections[currentPosition.name] === c._id ? 'border-slate-500 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}><img src={c.photo || `https://placehold.co/100x100/E0E0E0/333?text=${c.name.charAt(0)}`} alt={c.name} className="w-16 h-16 rounded-full object-cover" /><span className="font-semibold text-lg text-slate-800">{c.name}</span>{selections[currentPosition.name] === c._id && <CheckCircle className="ml-auto text-slate-600" size={24} />}</div>)}</div><div className="mt-8"><Button className="w-full" onClick={handleNext} disabled={!selections[currentPosition.name]}>{currentStep === (electionConfig.positions || []).length - 1 ? 'Review Vote' : 'Next'}</Button></div><p className="mt-2 text-center text-sm text-slate-500">Step {currentStep + 1} of {(electionConfig.positions || []).length}</p></Card>;
}
function ThankYouScreen() {
    return <Card className="text-center"><CheckCircle className="mx-auto text-green-500 mb-4" size={64} /><h1 className="text-3xl font-bold">Thank You!</h1><p className="text-slate-600 mt-2 text-lg">Your vote has been successfully recorded.</p><p className="text-slate-500 mt-6">Returning to scanner...</p></Card>;
}

function AutoScrollingList({ items, renderItem, maxHeight = '65vh', speed = 3 }) {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);

    useEffect(() => {
        if (containerRef.current && contentRef.current) {
            const needsScrolling = contentRef.current.scrollHeight > containerRef.current.clientHeight;
            setIsScrolling(needsScrolling);
        }
    }, [items, maxHeight]);

    if (!items || items.length === 0) {
        return <p className="text-center text-slate-500">No candidates found for this position.</p>;
    }

    const duration = items.length * speed;
    const animationStyle = { '--scroll-duration': `${duration}s` };

    return (
        <div ref={containerRef} style={{ maxHeight }} className="overflow-hidden relative">
            <div
                ref={contentRef}
                style={isScrolling ? animationStyle : {}}
                className={isScrolling ? 'animate-scroll' : ''}
            >
                <ul className="space-y-5 pb-5">
                    {items.map((item, index) => renderItem(item, index, 'original'))}
                </ul>
                {isScrolling && (
                    <ul className="space-y-5 pb-5">
                        {items.map((item, index) => renderItem(item, index, 'clone'))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// NEW: PublicResultsScreen is now fully mobile responsive
function PublicResultsScreen() {
    const { data: results, loading } = useApi('/public-results', 5000);
    const { data: config } = useApi('/election/config');
    const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

    const groupedResults = useMemo(() => {
        const grouped = (results || []).reduce((acc, candidate) => {
            (acc[candidate.position] = acc[candidate.position] || []).push(candidate);
            return acc;
        }, {});
        for (const position in grouped) {
            grouped[position].sort((a, b) => b.votes - a.votes);
        }
        return grouped;
    }, [results]);

    const totalVotes = useMemo(() => {
        return (results || []).reduce((sum, candidate) => sum + candidate.votes, 0);
    }, [results]);

    const positions = Object.keys(groupedResults);

    useEffect(() => {
        if (positions.length > 1) {
            const timer = setInterval(() => {
                setCurrentPositionIndex(prev => (prev + 1) % positions.length);
            }, 15000);
            return () => clearInterval(timer);
        }
    }, [positions.length]);

    if (loading && !results) {
        return <div className="text-center"><p className="text-2xl font-semibold">Loading Live Results...</p></div>;
    }
    
    if (!config || !config.publicScreenEnabled) {
        return <div className="text-center"><Card><p className="text-xl font-semibold">The public results screen is not currently enabled by the administrator.</p></Card></div>
    }

    const currentPosition = positions[currentPositionIndex];
    const candidates = groupedResults[currentPosition];
    const maxVotes = Math.max(...(candidates || []).map(c => c.votes), 1);

    const renderCandidate = (c, index, keySuffix) => (
        <li key={`${c._id}-${keySuffix}`} className="flex items-center gap-3 md:gap-6">
            <div className="relative">
                <img src={c.photo || `https://placehold.co/80x80/E0E0E0/333?text=${c.name.charAt(0)}`} alt={c.name} className="w-12 h-12 md:w-20 md:h-20 rounded-full object-cover shadow-md" />
                {index === 0 && c.votes > 0 && (
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-yellow-400 text-yellow-900 text-xs md:text-sm font-bold px-2 py-1 md:px-3 rounded-full shadow-lg transform rotate-12">
                        LEADING
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-baseline mb-2">
                    <span className="text-lg md:text-2xl font-semibold">{c.name}</span>
                    <span className="text-lg md:text-2xl font-bold">{c.votes} Votes</span>
                </div>
                <AnimatedBar value={c.votes} maxValue={maxVotes} />
            </div>
        </li>
    );
    
    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="text-center mb-6">
                <div className="logo-holder mb-4 h-16 md:h-24 flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-6">
                   {config.logoUrl && <img src={config.logoUrl} alt="Election Logo" className="mx-auto max-h-full w-auto object-contain" />}
                   {config.secondaryLogoUrl && <img src={config.secondaryLogoUrl} alt="Secondary Logo" className="mx-auto max-h-full w-auto object-contain" />}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800">{config.appTitle || 'Finelectra'} Live Results</h1>
            </header>

            {positions.length === 0 ? (
                 <Card><p className="text-center text-xl">No results to display yet. Please wait for votes to be cast.</p></Card>
            ) : (
                <>
                    <Card className="mb-6 text-center !p-4">
                        <p className="text-slate-600 font-semibold uppercase tracking-wider text-sm">Total Votes Cast</p>
                        <p className="text-4xl md:text-5xl font-bold">{totalVotes}</p>
                    </Card>
                    <AnimatePresence mode="wait">
                         <motion.div
                            key={currentPositionIndex}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                        >
                            <Card>
                                <h2 className="text-2xl md:text-3xl font-bold capitalize mb-6">{currentPosition}</h2>
                                <AutoScrollingList
                                    items={candidates}
                                    renderItem={renderCandidate}
                                    maxHeight="60vh"
                                />
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                    {positions.length > 1 && (
                        <div className="flex justify-center gap-3 mt-6">
                            {positions.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPositionIndex(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentPositionIndex ? 'bg-slate-800 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

             <footer className="text-center text-slate-500 text-sm mt-12 py-4">
                <p>Developed by Finixia dedecons</p>
            </footer>
        </div>
    );
}


// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [electionConfig, setElectionConfig] = useState(null);
    const [error, setError] = useState('');
    const [view, setView] = useState('main');

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/api/election/config`);
            if (!res.ok) throw new Error('Could not load election data. Is the server running?');
            setElectionConfig(await res.json());
        } catch (err) {
            if (!error) setError(err.message);
        }
    };

    useEffect(() => {
        if (electionConfig && electionConfig.appTitle) {
            document.title = electionConfig.appTitle;
        }
    }, [electionConfig]);


    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#/public') {
                setView('public');
            } else {
                setView('main');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        const verifyUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch(`${API_URL}/api/auth/verify`, { headers: { 'x-auth-token': token } });
                    if (res.ok) { setUser(await res.json()); } else { localStorage.removeItem('token'); }
                } catch (err) { localStorage.removeItem('token'); }
            }
        };
        verifyUser();
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.onload = () => setIsScriptLoaded(true);
        document.body.appendChild(script);
        fetchConfig();
        
        return () => { 
            if (document.body.contains(script)) { document.body.removeChild(script); }
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    const handleLogin = (userData) => { setUser(userData); };
    const handleLogout = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        setUser(null);
        localStorage.removeItem('token');
    };
    
    const renderContent = () => {
        if (view === 'public') {
            return <PublicResultsScreen />;
        }

        if (error) return <div className="max-w-md mx-auto"><Card><p className="text-red-500 text-center font-semibold">{error}</p></Card></div>;
        if (!electionConfig) return <div className="max-w-md mx-auto"><Card><p className="text-center">Loading Election...</p></Card></div>;
        // MODIFIED: Pass appTitle to LoginScreen
        if (!user) return <LoginScreen onLogin={handleLogin} logoUrl={electionConfig?.logoUrl} secondaryLogoUrl={electionConfig?.secondaryLogoUrl} appName={electionConfig?.appTitle} />; 
        if (user.role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} electionConfig={electionConfig} refetchElectionStatus={fetchConfig}/>;
        if (user.role === 'voter') {
            if (electionConfig.election.status !== 'Active') return <div className="max-w-md mx-auto"><Card><p className="text-center font-semibold text-lg">The election is not currently active.</p><p className="text-center mt-2">Current Status: {electionConfig.election.status}</p><div className="mt-6"><Button className="w-full" onClick={handleLogout}>Logout</Button></div></Card></div>
            return <MonitorScreen onLogout={handleLogout} isScriptLoaded={isScriptLoaded} electionConfig={electionConfig} refetchConfig={fetchConfig} />;
        }
    };
    return (
        <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
            <GlobalStyle />
            <main className="w-full">{renderContent()}</main>
        </div>
    );
}