import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  // await auth() instead of using directly
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Annakut Point System
        </h1>
        <p className="text-slate-600 mb-8">
          Manage seva points for Annakut festival
        </p>
        <div className="space-x-4">
          <Link
            href="/sign-in"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Sign In
          </Link>
          {/* <Link
            href="/sign-up"
            className="border border-orange-500 text-orange-500 hover:bg-orange-50 px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Sign Up
          </Link> */}
        </div>
      </div>
    </div>
  );
}
