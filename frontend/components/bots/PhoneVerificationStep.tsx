'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PhoneVerificationService } from '@/lib/whatsapp/phone-verification';
import { MetaGraphAPIClient, PhoneNumber } from '@/lib/whatsapp/meta-client';

interface PhoneVerificationStepProps {
  accessToken: string;
  businessAccountId: string;
  onVerified: (phoneNumberId: string) => void;
  onSkip?: () => void;
}

export function PhoneVerificationStep({
  accessToken,
  businessAccountId,
  onVerified,
  onSkip,
}: PhoneVerificationStepProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<'SMS' | 'VOICE'>('SMS');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadPhoneNumbers();
  }, [accessToken, businessAccountId]);

  const loadPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      const client = new MetaGraphAPIClient(accessToken);
      const numbers = await client.listPhoneNumbers(businessAccountId);
      setPhoneNumbers(numbers);
      
      // Auto-select first verified number if available
      const verified = numbers.find(n => n.code_verification_status === 'VERIFIED');
      if (verified) {
        setSelectedPhoneId(verified.id);
        onVerified(verified.id);
      } else if (numbers.length > 0) {
        const firstNumber = numbers[0];
        if (firstNumber) {
          setSelectedPhoneId(firstNumber.id);
        }
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error instanceof Error ? error.message : 'Telefonnummern konnten nicht geladen werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCode = async () => {
    if (!selectedPhoneId) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte wählen Sie eine Telefonnummer aus',
      });
      return;
    }

    try {
      setIsRequestingCode(true);
      const client = new MetaGraphAPIClient(accessToken);
      const service = new PhoneVerificationService(client);
      
      await service.requestVerificationCode(selectedPhoneId, {
        method: verificationMethod,
        language: 'de',
      });

      setCodeRequested(true);
      addToast({
        type: 'success',
        title: 'Code gesendet',
        message: `Ein Verifizierungscode wurde per ${verificationMethod === 'SMS' ? 'SMS' : 'Anruf'} gesendet`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error instanceof Error ? error.message : 'Code konnte nicht gesendet werden',
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte geben Sie den Verifizierungscode ein',
      });
      return;
    }

    try {
      setIsLoading(true);
      const client = new MetaGraphAPIClient(accessToken);
      const service = new PhoneVerificationService(client);
      
      const result = await service.verifyCode(selectedPhoneId, verificationCode);

      if (result.success && result.verified) {
        addToast({
          type: 'success',
          title: 'Verifizierung erfolgreich',
          message: 'Die Telefonnummer wurde erfolgreich verifiziert',
        });
        onVerified(selectedPhoneId);
      } else {
        addToast({
          type: 'error',
          title: 'Verifizierung fehlgeschlagen',
          message: result.error || 'Ungültiger Code',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error instanceof Error ? error.message : 'Verifizierung fehlgeschlagen',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPhone = phoneNumbers.find(p => p.id === selectedPhoneId);
  const isVerified = selectedPhone?.code_verification_status === 'VERIFIED';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telefonnummer auswählen
        </label>
        {isLoading && phoneNumbers.length === 0 ? (
          <div className="text-sm text-gray-500">Lade Telefonnummern...</div>
        ) : phoneNumbers.length === 0 ? (
          <div className="text-sm text-gray-500">
            Keine Telefonnummern gefunden. Bitte fügen Sie eine in Meta Business Manager hinzu.
          </div>
        ) : (
          <select
            value={selectedPhoneId}
            onChange={(e) => setSelectedPhoneId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            disabled={isLoading}
          >
            {phoneNumbers.map((phone) => (
              <option key={phone.id} value={phone.id}>
                {phone.display_phone_number} - {phone.verified_name}
                {phone.code_verification_status === 'VERIFIED' ? ' ✓ Verifiziert' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedPhone && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-900">
              Status: {selectedPhone.code_verification_status === 'VERIFIED' ? '✓ Verifiziert' : 'Nicht verifiziert'}
            </span>
            {isVerified && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                Bereit
              </span>
            )}
          </div>
          <p className="text-xs text-blue-800">
            Qualität: {selectedPhone.quality_rating}
          </p>
        </div>
      )}

      {selectedPhone && !isVerified && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verifizierungsmethode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="SMS"
                  checked={verificationMethod === 'SMS'}
                  onChange={(e) => setVerificationMethod(e.target.value as 'SMS' | 'VOICE')}
                  className="mr-2"
                />
                SMS
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="VOICE"
                  checked={verificationMethod === 'VOICE'}
                  onChange={(e) => setVerificationMethod(e.target.value as 'SMS' | 'VOICE')}
                  className="mr-2"
                />
                Anruf
              </label>
            </div>
          </div>

          {!codeRequested ? (
            <Button
              variant="primary"
              onClick={handleRequestCode}
              isLoading={isRequestingCode}
              className="w-full"
            >
              Verifizierungscode anfordern
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verifizierungscode eingeben
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Code eingeben"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleVerifyCode}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Code verifizieren
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCodeRequested(false);
                    setVerificationCode('');
                  }}
                  className="flex-1"
                >
                  Code erneut anfordern
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Diese Telefonnummer ist bereits verifiziert und einsatzbereit.
          </p>
        </div>
      )}

      {onSkip && (
        <Button
          variant="outline"
          onClick={onSkip}
          className="w-full"
        >
          Später verifizieren
        </Button>
      )}
    </div>
  );
}

