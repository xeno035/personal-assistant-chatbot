import React from 'react';
import { EditIcon } from './Icons';

interface ProfilePanelProps {
  className?: string;
  onEditPersona?: () => void;
}

const profilePhoto = 'assets/profile photo.jpg';
const email = 'vishnukarunakaran3535@gmail.com';
const location = 'Coimbatore, Tamil Nadu, India';

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ className = '', onEditPersona }) => {
  const skills = ['AI', 'React', 'Node.js'];

  return (
    <aside className="w-full h-full">
      <div className={`relative flex flex-col gap-8 rounded-3xl bg-white/90 backdrop-blur-xl shadow-[0_20px_55px_rgba(15,23,42,0.12)] border border-white/70 p-8 lg:p-10 ${className}`}>
        {onEditPersona && (
          <button
            onClick={onEditPersona}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 p-2 rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all"
            title="Edit persona"
            aria-label="Edit persona"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-[6px] border-white shadow-[0_10px_25px_rgba(15,23,42,0.12)]">
          <img
            src={profilePhoto}
            alt="Vishnu portrait"
            className="w-full h-full object-cover"
          />
        </div>
          <p className="text-[13px] uppercase tracking-[0.35em] text-indigo-400 font-semibold text-center">
            Profile
          </p>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-semibold text-slate-900">Vishnu</h2>
          <p className="text-base text-slate-500">Software Developer</p>
        </div>

        <div className="w-full space-y-6">
          <section>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">
              Skills
            </p>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-2xl border border-slate-200/80"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-[11px] uppercase tracking-[0.45em] text-slate-400 mb-1">
                Email
              </p>
              <p className="font-medium text-slate-700">{email}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.45em] text-slate-400 mb-1">
                Location
              </p>
              <p className="font-medium text-slate-700">{location}</p>
            </div>
          </section>
        </div>

        <div className="w-full pt-4 border-t border-slate-100 text-[13px] text-slate-500 leading-relaxed">
          Always exploring the intersection of human insight and AI craft.
        </div>
      </div>
    </aside>
  );
};

export default ProfilePanel;

