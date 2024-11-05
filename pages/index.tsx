import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      {session ? (
        <>
          <h1>Welcome, {session.user?.name}</h1>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => signOut()}
          >
            Sign Out
          </button>
          <div className="mt-5">
            <button className="bg-green-500 text-white py-2 px-4 rounded mr-2">
              Join LMS League
            </button>
            <button className="bg-purple-500 text-white py-2 px-4 rounded">
              Create Your Own League
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl">Please sign in</h1>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => signIn()}
          >
            Sign In
          </button>
        </>
      )}
    </div>
  );
}
