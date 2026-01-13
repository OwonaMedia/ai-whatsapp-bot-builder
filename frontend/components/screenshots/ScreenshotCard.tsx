'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ScreenshotCardProps {
  locale: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  linkHref: string;
  features: string[];
  videoSrc?: string; // Optional: Video-URL als Alternative zu Screenshot
  videoPoster?: string; // Optional: Poster-Bild für Video
  badgeLabel?: string;
  badgeClassName?: string;
}

export default function ScreenshotCard({
  locale,
  title,
  description,
  imageSrc,
  imageAlt,
  linkHref,
  features,
  videoSrc,
  videoPoster,
  badgeLabel,
  badgeClassName,
}: ScreenshotCardProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasVideo = !!videoSrc && !videoError;

  return (
    <>
      {/* Screenshot Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
        <div className="bg-gradient-to-r from-brand-green to-brand-dark p-4 text-white text-center">
          <h3 className="font-semibold text-lg md:text-xl">{title}</h3>
        </div>
        
        {/* Image/Video Container with Hover Zoom - Clean, no overlays */}
        <div 
          className="relative aspect-video bg-gray-100 overflow-hidden cursor-pointer group"
          onMouseEnter={() => {
            setIsZoomed(true);
            if (hasVideo && !isVideoPlaying) {
              setIsVideoPlaying(true);
            }
          }}
          onMouseLeave={() => {
            setIsZoomed(false);
            if (hasVideo && isVideoPlaying) {
              setIsVideoPlaying(false);
            }
          }}
          onClick={() => setShowModal(true)}
        >
          {hasVideo ? (
            <>
              {/* Video */}
              <video
                src={videoSrc}
                poster={videoPoster || imageSrc}
                className={`w-full h-full object-cover transition-transform duration-500 ease-in-out ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
                autoPlay={isVideoPlaying}
                muted
                loop
                playsInline
                preload="metadata"
                onMouseEnter={(e) => {
                  if (e.currentTarget.paused) {
                    e.currentTarget.play().catch(() => {
                      // Wenn Autoplay fehlschlägt, setze Video-Fehler
                      setVideoError(true);
                    });
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
                onError={(e) => {
                  console.error('Video-Fehler:', videoSrc);
                  setVideoError(true);
                }}
                onLoadStart={() => {
                  // Video lädt, reset Error-State
                  setVideoError(false);
                }}
              />
              {/* Fallback Image (wird angezeigt wenn Video-Fehler) */}
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={800}
                height={450}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  videoError ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                loading="lazy"
                quality={85}
              />
            </>
          ) : (
            /* Screenshot Bild mit Next.js Image */
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={800}
              height={450}
              className={`w-full h-full object-cover transition-transform duration-500 ease-in-out ${
                isZoomed ? 'scale-150' : 'scale-100'
              }`}
              loading="lazy"
              quality={85}
            />
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 md:p-6">
          {badgeLabel && (
            <div className="mb-3 md:mb-4">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${
                  badgeClassName || 'bg-brand-green/10 text-brand-green'
                }`}
              >
                {badgeLabel}
              </div>
            </div>
          )}
          <h4 className="font-semibold text-base md:text-lg mb-2">{title}</h4>
          <p className="text-gray-600 text-xs md:text-sm mb-4">
            {description}
          </p>
          
          {/* Features List (Mobile: kleiner, Desktop: normal) */}
          {features.length > 0 && (
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600 mb-4">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-brand-green flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
          
          <Link
            href={linkHref}
            className="text-brand-green font-semibold text-xs md:text-sm hover:underline inline-flex items-center gap-1"
          >
            Demo ansehen →
          </Link>
        </div>
      </div>

      {/* Modal for Fullscreen View */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-7xl w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-white text-black rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
              aria-label="Schließen"
            >
              ✕
            </button>

            {/* Fullscreen Image/Video */}
            <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
              {hasVideo ? (
                <video
                  src={videoSrc}
                  poster={videoPoster || imageSrc}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    const video = e.currentTarget;
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  width={1920}
                  height={1080}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  quality={90}
                />
              )}
            </div>

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
              <h3 className="font-semibold text-lg md:text-xl mb-2">{title}</h3>
              <p className="text-sm md:text-base opacity-90 mb-3">{description}</p>
              <Link
                href={linkHref}
                className="inline-block bg-brand-green text-white px-4 py-2 rounded-lg font-semibold text-sm md:text-base hover:bg-brand-dark transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Live-Demo öffnen →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

