export const ARTIFACT_RENDER_EVENT = 'slide-maker:artifact-render'
export const DEFAULT_ARTIFACT_RENDER_TIMEOUT_MS = 6000

export type ArtifactRenderStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ArtifactRenderSurface = 'edit' | 'preview'

export interface RenderDiagnostic {
  moduleId: string
  slideId: string
  moduleType: string
  surface: ArtifactRenderSurface
  status: ArtifactRenderStatus
  message?: string
  updatedAt: number
}

interface InlineArtifactSrcdocOptions {
  apiUrl?: string
  moduleId: string
  slideId: string
  surface: ArtifactRenderSurface
}

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/<\/script/gi, '<\\/script')
}

function absolutizeApiUrls(html: string, apiUrl?: string): string {
  if (!apiUrl) return html
  const normalizedBase = apiUrl.replace(/\/$/, '')
  return html.replace(/(href|src)=(['"])\/api\//g, `$1=$2${normalizedBase}/api/`)
}

function buildReporterScript(opts: InlineArtifactSrcdocOptions): string {
  const payload = {
    eventType: ARTIFACT_RENDER_EVENT,
    moduleId: opts.moduleId,
    slideId: opts.slideId,
    surface: opts.surface,
  }

  const eventType = escapeJsString(payload.eventType)
  const moduleId = escapeJsString(payload.moduleId)
  const slideId = escapeJsString(payload.slideId)
  const surface = escapeJsString(payload.surface)

  return `<script>(function(){var failed=false;function post(status,message){var payload={type:'${eventType}',moduleId:'${moduleId}',slideId:'${slideId}',moduleType:'artifact',surface:'${surface}',status:status};if(message){payload.message=String(message);}try{window.parent&&window.parent.postMessage(payload,'*');}catch(_){ }try{window.top&&window.top!==window.parent&&window.top.postMessage(payload,'*');}catch(_){ }}window.addEventListener('error',function(event){failed=true;post('error',event&&event.message?event.message:'Artifact render failed');});window.addEventListener('unhandledrejection',function(event){failed=true;var reason=event&&'reason'in event?event.reason:null;post('error',reason&&reason.message?reason.message:String(reason||'Unhandled promise rejection'));});window.addEventListener('load',function(){setTimeout(function(){if(!failed){post('ready');}},0);},{once:true});})();<\/script>`
}

function injectReporter(html: string, reporterScript: string): string {
  if (/<head(\s|>)/i.test(html)) {
    return html.replace(/<head(\s*[^>]*)>/i, `<head$1>${reporterScript}`)
  }

  if (/<body(\s|>)/i.test(html)) {
    return html.replace(/<body(\s*[^>]*)>/i, `<body$1>${reporterScript}`)
  }

  if (/<html(\s|>)/i.test(html)) {
    return html.replace(/<html(\s*[^>]*)>/i, `<html$1><head>${reporterScript}</head>`)
  }

  return `<!DOCTYPE html><html><head>${reporterScript}</head><body>${html}</body></html>`
}

export function buildInlineArtifactSrcdoc(
  rawSource: string,
  options: InlineArtifactSrcdocOptions,
): string {
  const rewritten = absolutizeApiUrls(rawSource, options.apiUrl)
  const reporter = buildReporterScript(options)
  return injectReporter(rewritten, reporter)
}
