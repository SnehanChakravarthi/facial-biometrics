import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Facial Biometric System
        </h1>

        <div className="space-x-4">
          <Link
            className="w-64 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            href="/enrollment"
          >
            Facial Enrollment
          </Link>

          <Link
            className="w-64 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            href="/authentication"
          >
            Facial Authentication
          </Link>
        </div>

        <p className="text-sm text-gray-600 mt-4">
          New user? Start with Enrollment. Returning user? Use Authentication.
        </p>
      </div>
    </div>
  );
}
