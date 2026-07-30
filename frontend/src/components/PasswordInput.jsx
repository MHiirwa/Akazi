import { useState } from "react";

// A password input with a built-in "Show / Hide" toggle so people can see what
// they are typing while filling it in. It's a drop-in replacement for a plain
// <input type="password" ... />: pass the same props (id, value, onChange,
// required, autoComplete, placeholder, minLength, aria-*, etc.) and they flow
// straight through to the underlying input.
export default function PasswordInput({ id, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input id={id} type={visible ? "text" : "password"} {...rest} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
