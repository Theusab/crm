"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";

type TargetKey = "BR" | "CA-EN" | "CA-FR" | "US" | "NA" | "GB" | "FR" | "PT" | "ES" | "MX" | "DE" | "IT" | "JP" | "CN" | "NL" | "EN";

type MessageTarget = {
  key: TargetKey;
  country: string;
  language: string;
  dialCode: string;
  greeting: (name: string) => string;
};

const targets: MessageTarget[] = [
  { key: "BR", country: "Brasil", language: "Português", dialCode: "55", greeting: (name) => `Olá, ${name}! Tudo bem? Gostaria de conversar com você.` },
  { key: "CA-EN", country: "Canadá", language: "Inglês", dialCode: "1", greeting: (name) => `Hi, ${name}! How are you? I would like to talk with you.` },
  { key: "CA-FR", country: "Canadá", language: "Francês", dialCode: "1", greeting: (name) => `Bonjour, ${name} ! Comment allez-vous ? J'aimerais échanger avec vous.` },
  { key: "US", country: "Estados Unidos", language: "Inglês", dialCode: "1", greeting: (name) => `Hi, ${name}! How are you? I would like to talk with you.` },
  { key: "NA", country: "EUA/Canadá (código +1)", language: "Inglês", dialCode: "1", greeting: (name) => `Hi, ${name}! How are you? I would like to talk with you.` },
  { key: "GB", country: "Reino Unido", language: "Inglês", dialCode: "44", greeting: (name) => `Hi, ${name}! How are you? I would like to speak with you.` },
  { key: "FR", country: "França", language: "Francês", dialCode: "33", greeting: (name) => `Bonjour, ${name} ! Comment allez-vous ? J'aimerais échanger avec vous.` },
  { key: "PT", country: "Portugal", language: "Português", dialCode: "351", greeting: (name) => `Olá, ${name}! Como está? Gostaria de falar consigo.` },
  { key: "ES", country: "Espanha", language: "Espanhol", dialCode: "34", greeting: (name) => `Hola, ${name}. ¿Cómo está? Me gustaría conversar con usted.` },
  { key: "MX", country: "México", language: "Espanhol", dialCode: "52", greeting: (name) => `Hola, ${name}. ¿Cómo está? Me gustaría conversar con usted.` },
  { key: "DE", country: "Alemanha", language: "Alemão", dialCode: "49", greeting: (name) => `Hallo, ${name}! Wie geht es Ihnen? Ich würde gerne mit Ihnen sprechen.` },
  { key: "IT", country: "Itália", language: "Italiano", dialCode: "39", greeting: (name) => `Buongiorno, ${name}! Come sta? Mi piacerebbe parlare con Lei.` },
  { key: "JP", country: "Japão", language: "Japonês", dialCode: "81", greeting: (name) => `${name}さん、こんにちは。ご都合のよいときにお話しできればと思います。` },
  { key: "CN", country: "China", language: "Chinês", dialCode: "86", greeting: (name) => `您好，${name}！希望您一切顺利。我想和您聊一聊。` },
  { key: "NL", country: "Países Baixos", language: "Holandês", dialCode: "31", greeting: (name) => `Hallo ${name}, hoe gaat het? Ik zou graag met u willen praten.` },
  { key: "EN", country: "Não identificado", language: "Inglês", dialCode: "", greeting: (name) => `Hi, ${name}! How are you? I would like to talk with you.` },
];

const canadianCities = new Set([
  "toronto", "vancouver", "ottawa", "calgary", "edmonton", "winnipeg", "hamilton", "london",
  "mississauga", "waterloo", "surrey", "burnaby", "regina", "saskatoon", "halifax", "victoria",
  "kelowna", "burlington", "kitchener", "windsor", "kingston", "markham", "brampton", "richmond hill",
  "north york", "scarborough", "montreal", "quebec city", "quebec", "gatineau", "sherbrooke",
  "trois-rivieres", "levis", "drummondville", "saguenay", "rimouski",
]);

const frenchCanadianCities = new Set([
  "montreal", "quebec city", "quebec", "gatineau", "sherbrooke", "trois-rivieres", "levis",
  "drummondville", "saguenay", "rimouski",
]);

const countryAliases: Record<string, TargetKey> = {
  br: "BR", brasil: "BR", brazil: "BR",
  ca: "CA-EN", canada: "CA-EN", canadá: "CA-EN",
  us: "US", usa: "US", "united states": "US", "estados unidos": "US",
  gb: "GB", uk: "GB", "united kingdom": "GB", "reino unido": "GB",
  fr: "FR", france: "FR", franca: "FR",
  pt: "PT", portugal: "PT",
  es: "ES", spain: "ES", espanha: "ES", espana: "ES",
  mx: "MX", mexico: "MX", méxico: "MX",
  de: "DE", germany: "DE", alemanha: "DE",
  it: "IT", italy: "IT", italia: "IT", itália: "IT",
  jp: "JP", japan: "JP", japao: "JP",
  cn: "CN", china: "CN",
  nl: "NL", netherlands: "NL", "paises baixos": "NL",
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findTarget(key: TargetKey) {
  return targets.find((target) => target.key === key) ?? targets[targets.length - 1];
}

function inferTarget(phone: string | null, country: string | null, language: string | null, city: string | null, source: string | null): TargetKey {
  const normalizedCountry = country ? normalize(country) : "";
  const normalizedCity = city ? normalize(city) : "";
  const normalizedLanguage = language ? normalize(language) : "";

  if (normalizedLanguage.startsWith("fr")) return normalizedCountry === "ca" || normalizedCountry.includes("canad") || normalizedLanguage.includes("-ca") ? "CA-FR" : "FR";
  if (normalizedLanguage.startsWith("en")) return normalizedCountry === "ca" || normalizedCountry.includes("canad") || normalizedLanguage.includes("-ca") ? "CA-EN" : "EN";
  if (normalizedLanguage.startsWith("pt")) return normalizedCountry === "pt" || normalizedCountry.includes("portugal") ? "PT" : "BR";
  if (normalizedLanguage.startsWith("es")) return normalizedCountry === "mx" || normalizedCountry.includes("mex") ? "MX" : "ES";
  if (normalizedLanguage.startsWith("de")) return "DE";
  if (normalizedLanguage.startsWith("it")) return "IT";
  if (normalizedLanguage.startsWith("ja")) return "JP";
  if (normalizedLanguage.startsWith("zh")) return "CN";
  if (normalizedLanguage.startsWith("nl")) return "NL";

  const countryTarget = country ? countryAliases[normalizedCountry] : undefined;
  if (countryTarget) {
    if (countryTarget === "CA-EN" && frenchCanadianCities.has(normalizedCity)) return "CA-FR";
    return countryTarget;
  }

  if (source?.toLocaleLowerCase().includes("leadsblackcore")) return frenchCanadianCities.has(normalizedCity) ? "CA-FR" : "CA-EN";
  if (canadianCities.has(normalizedCity)) return frenchCanadianCities.has(normalizedCity) ? "CA-FR" : "CA-EN";

  const rawPhone = phone?.trim() ?? "";
  const isInternational = rawPhone.startsWith("+") || rawPhone.startsWith("00");
  const digits = rawPhone.replace(/\D/g, "");
  if (isInternational && digits.startsWith("55")) return "BR";
  if (isInternational && digits.startsWith("351")) return "PT";
  if (isInternational && digits.startsWith("44")) return "GB";
  if (isInternational && digits.startsWith("33")) return "FR";
  if (isInternational && digits.startsWith("34")) return "ES";
  if (isInternational && digits.startsWith("52")) return "MX";
  if (isInternational && digits.startsWith("49")) return "DE";
  if (isInternational && digits.startsWith("39")) return "IT";
  if (isInternational && digits.startsWith("81")) return "JP";
  if (isInternational && digits.startsWith("86")) return "CN";
  if (isInternational && digits.startsWith("31")) return "NL";
  if (isInternational && digits.startsWith("1")) return "NA";
  if (!isInternational && (digits.length === 10 || digits.length === 11)) return "BR";
  return "EN";
}

function whatsappPhone(phone: string, target: MessageTarget) {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length > 15) return null;
  if (raw.startsWith("+") || raw.startsWith("00")) return digits.length >= 8 ? digits : null;
  if (!target.dialCode) return digits.length >= 8 ? digits : null;
  if (digits.startsWith(target.dialCode) && digits.length >= 10) return digits;
  if (target.dialCode === "1") {
    if (digits.length === 10) return `1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return digits;
    return null;
  }
  if (target.dialCode === "55") {
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return null;
  }
  const nationalNumber = digits.startsWith("0") ? digits.slice(1) : digits;
  const international = `${target.dialCode}${nationalNumber}`;
  return nationalNumber.length >= 7 && international.length <= 15 ? international : null;
}

function getSuggestedMessage(targetKey: TargetKey, name: string) {
  return findTarget(targetKey).greeting(name.trim() || "there");
}

export function WhatsAppQuickMessage({
  phone,
  name,
  city = null,
  country = null,
  language = null,
  source = null,
}: {
  phone: string | null;
  name: string;
  city?: string | null;
  country?: string | null;
  language?: string | null;
  source?: string | null;
}) {
  const detectedKey = inferTarget(phone, country, language, city, source);
  const [targetKey, setTargetKey] = useState<TargetKey>(detectedKey);
  const [message, setMessage] = useState(() => getSuggestedMessage(detectedKey, name));
  const [messageEdited, setMessageEdited] = useState(false);
  const target = findTarget(targetKey);
  const number = useMemo(() => phone ? whatsappPhone(phone, target) : null, [phone, target]);
  const href = number && message.trim()
    ? `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`
    : null;

  function changeTarget(value: string) {
    const nextKey = value as TargetKey;
    setTargetKey(nextKey);
    if (!messageEdited) setMessage(getSuggestedMessage(nextKey, name));
  }

  return <div className="crm-whatsapp-composer">
    <div className="crm-whatsapp-heading">
      <span className="crm-whatsapp-icon"><MessageCircle size={15} /></span>
      <div><strong>Enviar mensagem</strong><small>País sugerido: {findTarget(detectedKey).country} · {findTarget(detectedKey).language}{city ? ` · ${city}` : ""}. Ajuste se necessário.</small></div>
    </div>
    <label className="crm-whatsapp-field">
      País e idioma
      <select value={targetKey} onChange={(event) => changeTarget(event.target.value)}>
      {targets.filter((option) => option.key !== "EN").map((option) => <option key={option.key} value={option.key}>{option.country} · {option.language}</option>)}
      </select>
    </label>
    <label className="crm-whatsapp-field">
      Mensagem em {target.language}
      <textarea value={message} onChange={(event) => { setMessage(event.target.value); setMessageEdited(true); }} maxLength={4000} rows={3} placeholder="Escreva sua mensagem no idioma selecionado..." />
    </label>
    {messageEdited && <button type="button" className="crm-whatsapp-refresh" onClick={() => { setMessage(getSuggestedMessage(targetKey, name)); setMessageEdited(false); }}>Usar sugestão em {target.language}</button>}
    <div className="crm-whatsapp-footer">
      <small>{number ? `Número preparado com o código +${target.dialCode || "internacional"}. Revise e envie no WhatsApp.` : "Confira o telefone e o país para preparar o link."}</small>
      {href
        ? <a className="button button-primary" href={href} target="_blank" rel="noreferrer">Abrir no WhatsApp <ArrowUpRight size={14} /></a>
        : <span className="button button-primary crm-whatsapp-disabled" aria-disabled="true">Abrir no WhatsApp <ArrowUpRight size={14} /></span>}
    </div>
  </div>;
}
