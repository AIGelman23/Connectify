import ConnectifyLogo from "./ConnectifyLogo";

const ConnectifyLoader = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100">
    <div className="text-center">
      <ConnectifyLogo width={350} height={350} className="mx-auto animate-pulse" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

export default ConnectifyLoader;
