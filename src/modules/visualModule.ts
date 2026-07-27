/**
 * AuditTest Vision — Visual Analysis Module
 *
 * Uses a Vision LLM API to detect broken layouts, overlapping elements,
 * misalignment, and rendering anomalies from a page screenshot.
 *
 * The module sends the base64 screenshot alongside element bounding-box
 * metadata to the LLM, which returns structured issue findings.
 */

import { DOMElementMeta, Severity } from '../core/auditEngine';

// --- Module Types ---

export interface VisualIssue {
  title: string;
  description: string;
  severity: Severity;
  selector?: string;
  /** Bounding box of the problematic area in the screenshot */
  region?: { x: number; y: number; width: number; height: number };
}

/** Raw response shape expected from the Vision LLM */
interface VisionLLMResponse {
  issues: Array<{
    title: string;
    description: string;
    severity: string;
    selector?: string;
    region?: { x: number; y: number; width: number; height: number };
  }>;
}

// --- Module Implementation ---

export class VisualModule {
  private apiEndpoint: string;

  constructor(private apiKey?: string) {
    // Configurable endpoint — defaults to a local dev proxy
    this.apiEndpoint = process.env.VISION_API_ENDPOINT || 'https://api.audittest.local/v1/vision';
  }

  /**
   * Analyze a screenshot for visual defects.
   * Sends the image + element metadata to the Vision LLM for inspection.
   */
  async analyze(screenshotBase64: string, elements: DOMElementMeta[]): Promise<VisualIssue[]> {
    const prompt = this.buildPrompt(elements);

    try {
      const response = await this.callVisionAPI(screenshotBase64, prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('[VisualModule] Analysis failed:', error);
      return [];
    }
  }

  /** Construct the analysis prompt with element context */
  private buildPrompt(elements: DOMElementMeta[]): string {
    const elementSummary = elements
      .map(el => `<${el.tagName}> at (${el.boundingBox.x},${el.boundingBox.y}) size ${el.boundingBox.width}x${el.boundingBox.height} [${el.selector}]`)
      .join('\n');

    return `You are a UI/UX quality auditor. Analyze this page screenshot for visual defects.

Look for:
- Overlapping elements that shouldn't overlap
- Misaligned components (broken grid/flexbox)
- Text overflow or truncation issues
- Elements rendered outside viewport bounds
- Broken image placeholders or missing assets
- Inconsistent spacing or padding

Page elements:
${elementSummary}

Return a JSON array of issues with: title, description, severity (critical|major|minor|info), selector, region {x,y,width,height}.`;
  }

  /** Call the Vision LLM API with screenshot and prompt */
  private async callVisionAPI(imageBase64: string, prompt: string): Promise<VisionLLMResponse> {
    const payload = {
      model: 'vision-audit-v1',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    };

    const res = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Vision API returned ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    // LLM response content is typically in choices[0].message.content
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content) as VisionLLMResponse;
  }

  /** Normalize LLM response into typed VisualIssue array */
  private parseResponse(response: VisionLLMResponse): VisualIssue[] {
    return (response.issues || []).map(issue => ({
      title: issue.title,
      description: issue.description,
      severity: this.normalizeSeverity(issue.severity),
      selector: issue.selector,
      region: issue.region,
    }));
  }

  /** Ensure severity is a valid enum value */
  private normalizeSeverity(raw: string): Severity {
    const valid: Severity[] = ['critical', 'major', 'minor', 'info'];
    const normalized = raw?.toLowerCase() as Severity;
    return valid.includes(normalized) ? normalized : 'info';
  }
}
