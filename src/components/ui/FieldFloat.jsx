import { ChevronDown, AlertCircle, Check } from "lucide-react";

export function FieldInput({ label, value, onChange, type = "text", required, error, hint, span2, ...rest }) {
  const invalid = !!error;
  const valid = !invalid && required && value;
  return (
    <div className={`field field-float ${invalid ? "is-invalid" : ""} ${valid ? "is-valid" : ""} ${span2 ? "span-2" : ""}`}>
      <input type={type} placeholder=" " value={value} onChange={(e) => onChange(e.target.value)} required={required} {...rest} />
      <label>{label}{required ? " *" : ""}</label>
      {valid && <Check className="field-float-check" />}
      {hint && !invalid && <span className="field-hint">{hint}</span>}
      {invalid && (
        <span className="field-error" style={{ display: "flex" }}>
          <AlertCircle /> {error}
        </span>
      )}
    </div>
  );
}

export function FieldTextarea({ label, value, onChange, required, span2, ...rest }) {
  return (
    <div className={`field field-float ${span2 ? "span-2" : ""}`}>
      <textarea placeholder=" " value={value} onChange={(e) => onChange(e.target.value)} required={required} {...rest} />
      <label>{label}{required ? " *" : ""}</label>
    </div>
  );
}

export function FieldSelect({ label, value, onChange, options, required, error, span2 }) {
  const invalid = !!error;
  return (
    <div className={`field field-float ${invalid ? "is-invalid" : ""} ${span2 ? "span-2" : ""}`}>
      <select className={value ? "has-value" : ""} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="" disabled hidden></option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <label>{label}{required ? " *" : ""}</label>
      <ChevronDown className="select-chevron" />
      {invalid && (
        <span className="field-error" style={{ display: "flex" }}>
          <AlertCircle /> {error}
        </span>
      )}
    </div>
  );
}
