'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { mockAuditLogs, AuditLogEntry } from '@/lib/store';

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);

    useEffect(() => {
        const savedLogs = localStorage.getItem('labloop_audit');
        if (savedLogs) {
            setLogs(JSON.parse(savedLogs));
        } else {
            setLogs(mockAuditLogs);
            localStorage.setItem('labloop_audit', JSON.stringify(mockAuditLogs));
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Immutable Audit Ledger</h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Real-time, cryptographically serialised system events logs capturing checking events, permissions and assets status modifications.
                    </p>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-medium text-white">Activity Records</h2>
                        <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-3 py-1 text-xs rounded-full font-mono">
                            SECURE LEDGER ACTIVE
                        </span>
                    </div>

                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No actions recorded on the ledger yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-700 font-mono text-sm">
                            {logs.map((log) => (
                                <div key={log.id} className="p-6 hover:bg-gray-750/50 transition duration-150">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleString()}]</span>
                                            <span className="text-blue-400 font-bold">{log.action}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
                                            ID: {log.id}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p><span className="text-emerald-400">Actor:</span> {log.actor}</p>
                                        <p><span className="text-purple-400">Target:</span> {log.target}</p>
                                        <p className="text-gray-300 mt-2 pl-4 border-l-2 border-gray-600 italic">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}