import { useRef } from "react";

export default function OtpInput({ value, onChange, disabled = false }) {
  const refs = useRef([]);
  function changeDigit(index, raw) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const digits = value.split("");
    if (!digit) digits[index] = "";
    else digits[index] = digit;
    onChange(digits.join("").slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }
  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !value[index] && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }
  function handlePaste(event) {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    refs.current[Math.min(digits.length, 5)]?.focus();
  }
  return <div className="otp-input"><span className="sr-only">Enter your 6-digit code</span><div className="otp-cells" role="group" aria-label="Six-digit verification code">{Array.from({length:6},(_,index)=><input key={index} ref={element=>{refs.current[index]=element}} type="text" inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} aria-label={`Digit ${index+1} of 6`} value={value[index]||""} onChange={event=>changeDigit(index,event.target.value)} onKeyDown={event=>handleKeyDown(index,event)} onPaste={handlePaste} maxLength={1} disabled={disabled} required={index===0} />)}</div></div>;
}
