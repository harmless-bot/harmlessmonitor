from typing import Dict, Any, List
import re

class RiskEngine:
    def __init__(self):
        self.ssn_pattern = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
        self.cc_pattern = re.compile(r'\b(?:\d{4}[ -]?){3}\d{4}\b')
        self.api_key_pattern = re.compile(r'(?i)(?:api_key|apikey|bearer|token)[\s:=]+["\']?([a-zA-Z0-9_\-]{16,})["\']?')

    def evaluate(self, flow: Dict[str, Any]) -> Dict[str, Any]:
        score = 0
        indicators = []
        why = []
        
        # 1. Large Outbound Transfer (> 10MB)
        if flow.get("bytes_out", 0) > 10_000_000:
            score += 40
            indicators.append("large_outbound_transfer")
            why.append(f"Massive outbound transfer detected ({flow['bytes_out'] / 1_000_000:.1f} MB)")
            
        # 2. Cloud Storage Upload (heuristic based on service label)
        service = flow.get("service_label", "").lower()
        if "drive" in service or "mega" in service or "s3" in service or "dropbox" in service:
            if flow.get("bytes_out", 0) > 500_000:  # > 500KB to cloud storage is notable
                score += 30
                indicators.append("cloud_storage_upload")
                why.append(f"Upload to cloud storage service: {flow.get('service_label')}")
                
        # 3. Unusual Country
        country = flow.get("country", "Unknown")
        if country in ["RU", "CN", "KP", "IR"]:
            score += 45
            indicators.append("unusual_country")
            why.append(f"Traffic to unusual or high-risk region: {country}")
            
        # 4. Unresolved/Unknown Identity
        if flow.get("confidence_score", 0) < 50 and flow.get("bytes_out", 0) > 100_000:
            score += 25
            indicators.append("unresolved_destination")
            why.append("Significant data sent to unresolved/unknown destination")
            
        # 5. External Threat Intel Score (AbuseIPDB)
        threat_score = flow.get("threat_score", 0)
        if threat_score > 0:
            # Add scaled threat score directly to our score
            score += threat_score
            indicators.append("high_reputation_risk")
            why.append(f"External threat intelligence reports risk score: {threat_score}")
            
        # 6. Suspicious Usage Type (VPN/Proxy/Tor)
        usage_type = (flow.get("enriched_usage_type") or "").lower()
        if any(x in usage_type for x in ["vpn", "proxy", "tor", "hosting"]):
            score += 20
            indicators.append("suspicious_usage_type")
            why.append(f"Destination is a known {usage_type} provider")

        # 7. Payload Regex Detection (DLP)
        snippets = flow.get("payload_snippets", [])
        is_sensitive = False
        for snippet in snippets:
            if self.ssn_pattern.search(snippet):
                score += 100
                indicators.append("dlp_ssn_leak")
                why.append("Potential SSN detected in unencrypted payload")
                is_sensitive = True
                break
            
        for snippet in snippets:
            if self.cc_pattern.search(snippet):
                score += 100
                indicators.append("dlp_cc_leak")
                why.append("Potential Credit Card detected in unencrypted payload")
                is_sensitive = True
                break
                
        for snippet in snippets:
            if self.api_key_pattern.search(snippet):
                score += 100
                indicators.append("dlp_apikey_leak")
                why.append("Potential API Key / Token detected in unencrypted payload")
                is_sensitive = True
                break

        # Cap score at 100
        score = min(score, 100)
        
        # Determine Level
        if score >= 80:
            level = "critical"
        elif score >= 60:
            level = "high"
        elif score >= 40:
            level = "medium"
        else:
            level = "low"
            
        # If no risk, add benign reasoning
        if level == "low" and not why:
            why.append("Routine background traffic")
            
        return {
            "risk_score": score,
            "risk_level": level,
            "flags": indicators,
            "why_flagged": why,
            "strongest_indicators": indicators[:2] if indicators else ["none"],
            "recommended_steps": "Analyze payload bytes" if score >= 60 else "No action needed",
            "is_sensitive": is_sensitive
        }
