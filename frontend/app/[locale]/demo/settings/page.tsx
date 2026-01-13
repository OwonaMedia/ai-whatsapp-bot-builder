'use client';
export const dynamic = 'force-dynamic';

/**
 * DEMO-SEITE: Einstellungen
 * Zeigt Konfigurationsoptionen für Screenshots
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function SettingsDemoPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'compliance' | 'team'>(
    'general'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">⚙️ Einstellungen</h1>
              <p className="text-white/90 mb-1">
                Konfigurieren Sie Ihr Konto und Ihre Bot-Einstellungen
              </p>
              <p className="text-white/80 text-sm">
                Alle Änderungen werden automatisch gespeichert
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-6xl opacity-20">🔧</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <nav className="space-y-2">
                {[
                  { id: 'general', label: 'Allgemein', icon: '⚙️' },
                  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                  { id: 'compliance', label: 'Compliance', icon: '🔒' },
                  { id: 'team', label: 'Team', icon: '👥' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Allgemeine Einstellungen</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firmenname
                      </label>
                      <input
                        type="text"
                        defaultValue="Mein Unternehmen"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sprache
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option>Deutsch</option>
                        <option>English</option>
                        <option>Français</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zeitzone
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option>Europe/Berlin (UTC+1)</option>
                        <option>Europe/London (UTC+0)</option>
                        <option>America/New_York (UTC-5)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">E-Mail-Benachrichtigungen</h3>
                        <p className="text-sm text-gray-600">
                          Erhalten Sie Updates per E-Mail
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Settings */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">WhatsApp Business Integration</h2>

                  <div className="space-y-6">
                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600 font-semibold">✅ Verbunden</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        WhatsApp Business API ist aktiv verbunden
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        defaultValue="+49 123 4567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Account ID
                      </label>
                      <input
                        type="text"
                        defaultValue="123456789012345"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue="https://whatsapp.owona.de/api/webhooks/whatsapp"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          disabled
                        />
                        <Button variant="outline" size="md">
                          Kopieren
                        </Button>
                      </div>
                    </div>

                    <Button variant="primary" size="md" className="w-full">
                      Webhook neu konfigurieren
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Settings */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">DSGVO & Compliance</h2>

                  <div className="space-y-6">
                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                      <h3 className="font-semibold text-gray-900 mb-2">✅ DSGVO-konform</h3>
                      <p className="text-sm text-gray-700">
                        Alle Daten werden gemäß EU-DSGVO verarbeitet und gespeichert
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Datenretention (Tage)
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option>30 Tage (Standard)</option>
                        <option>7 Tage</option>
                        <option>14 Tage</option>
                        <option>60 Tage</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">Automatische PII-Filterung</h3>
                        <p className="text-sm text-gray-600">
                          Persönliche Daten automatisch erkennen und filtern
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-4">Rechtsdokumente</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Button variant="outline" size="md" className="justify-start">
                          📄 AVV (Auftragsverarbeitungsvertrag) herunterladen
                        </Button>
                        <Button variant="outline" size="md" className="justify-start">
                          📋 DSFA (Datenschutz-Folgenabschätzung) herunterladen
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Settings */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Team-Mitglieder</h2>
                    <Button variant="primary" size="md">
                      + Mitglied einladen
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        name: 'Max Mustermann',
                        email: 'max@example.com',
                        role: 'Admin',
                        status: 'Aktiv',
                      },
                      {
                        name: 'Anna Schmidt',
                        email: 'anna@example.com',
                        role: 'Editor',
                        status: 'Aktiv',
                      },
                      {
                        name: 'Tom Weber',
                        email: 'tom@example.com',
                        role: 'Viewer',
                        status: 'Ausstehend',
                      },
                    ].map((member, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {member.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              member.status === 'Aktiv'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {member.status}
                          </span>
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {member.role}
                          </span>
                          <Button variant="outline" size="sm">
                            Bearbeiten
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}










