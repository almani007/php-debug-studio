# ADR-003: DBGp Xdebug 3.x Protocol Implementation

## Status
Accepted

## Context
Interactive step debugging in PHP relies on the DBGp protocol implemented by Xdebug. The PHP engine initiates an outbound TCP connection to a listening debugger IDE when execution triggers a breakpoint or debug flag.

## Decision
1. Implement a native Go TCP listener on port `9003` (`127.0.0.1:9003`).
2. Adhere to DBGp wire framing: `{length}\0{xml_payload}\0`.
3. Support path mapping configuration between container files (`file:///var/www/html/...`) and host workspace paths.
4. Support safe evaluation with explicit user gating; prevent arbitrary auto-execution of unverified expressions.

## Consequences
- **Positive**: Native Xdebug compatibility without proprietary IDE plugins.
- **Negative**: Strict XML parsing with length bounds is required to avoid memory exhaustion attacks.
