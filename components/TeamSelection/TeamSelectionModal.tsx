// TeamSelectionModal.tsx - Component for selecting a team in the Last Man Standing competition
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

// Define type interfaces for the component
interface Team {
  id: string;
  name: string;
  logo?: string;
}

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: Team) => void;
  teams: Team[];
}

export default function TeamSelectionModal({
  isOpen,
  onClose,
  onSelectTeam,
  teams,
}: TeamSelectionModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    onSelectTeam(team);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Select Your Team
                    </Dialog.Title>
                    <div className="mt-4">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => handleTeamSelect(team)}
                            className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                              selectedTeam?.id === team.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            {team.logo && (
                              <Image
                                src={team.logo}
                                alt={team.name}
                                className="w-12 h-12 object-contain mb-2"
                                width={48}
                                height={48}
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900">{team.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 