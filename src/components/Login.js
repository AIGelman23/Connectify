import React from "react";
import "./Login.css";

function Login() {
  return (
    <div className="login-container">
      <form className="login-form">
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            className="login-input"
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            inputMode="text"
            required
            className="login-input"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
          style={{
            minHeight: 48,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            letterSpacing: "0.03em",
            WebkitAppearance: "none",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
