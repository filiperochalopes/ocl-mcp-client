(() => {
  const SESSION_CONFIG_KEY = 'ocl_mcp_config'
  const LOCAL_TOOLS_KEY = 'ocl_mcp_tools'
  const CHAT_HISTORY_KEY = 'ocl_mcp_chat_history'

  const TOOL_DEFINITIONS = [
    {
      id: 'list_servers',
      name: 'List servers',
      description: 'Show available OCL server configurations.'
    },
    {
      id: 'search_owners',
      name: 'Search owners',
      description: 'Find users and organizations that publish terminology.'
    },
    {
      id: 'search_repositories',
      name: 'Search repositories',
      description: 'Discover sources and collections by query or owner.'
    },
    {
      id: 'get_repository_versions',
      name: 'Get repository versions',
      description: 'List available versions for a repository.'
    },
    {
      id: 'search_concepts',
      name: 'Search concepts',
      description: 'Find concepts by query, repository, or filters.'
    },
    {
      id: 'search_mappings',
      name: 'Search mappings',
      description: 'Find mappings between concepts.'
    },
    {
      id: 'match_concepts',
      name: 'Match concepts',
      description: 'Suggest best matches for free text terms.'
    },
    {
      id: 'add_or_update_concept_translations',
      name: 'Add or update translations',
      description: 'Create or update translated names for concepts.'
    },
    {
      id: 'list_expansions',
      name: 'List expansions',
      description: 'List expansions for a collection version.'
    },
    {
      id: 'get_expansion',
      name: 'Get expansion',
      description: 'Fetch a specific expansion details.'
    },
    {
      id: 'create_mapping',
      name: 'Create mapping',
      description: 'Create a mapping between concepts.'
    },
    {
      id: 'cascade',
      name: 'Cascade',
      description: 'Explore concept relationships with cascade operations.'
    },
    {
      id: 'suggest_mappings',
      name: 'Suggest mappings',
      description: 'Get AI-powered mapping suggestions.'
    },
    {
      id: 'validate_mapping',
      name: 'Validate mapping',
      description: 'Validate a proposed mapping using semantic similarity.'
    },
    {
      id: 'bulk_map_terms',
      name: 'Bulk map terms',
      description: 'Process multiple terms in a single mapping run.'
    },
    {
      id: 'save_repository',
      name: 'Save repository',
      description: 'Save or update repository metadata.'
    }
  ]

  const getSessionConfig = () => {
    const raw = sessionStorage.getItem(SESSION_CONFIG_KEY)
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn('Failed to parse session config', err)
      return {}
    }
  }

  const setSessionConfig = (value) => {
    sessionStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(value))
  }

  const getChatHistory = () => {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.warn('Failed to parse chat history', err)
      return []
    }
  }

  const setChatHistory = (entries) => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(entries))
  }

  const readSessionDefaults = () => {
    const el = document.getElementById('session-defaults')
    if (!el) return {}
    try {
      return JSON.parse(el.textContent || '{}')
    } catch (err) {
      console.warn('Failed to parse session defaults', err)
      return {}
    }
  }

  const getToolsConfig = () => {
    const raw = localStorage.getItem(LOCAL_TOOLS_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn('Failed to parse tools config', err)
      return null
    }
  }

  const setToolsConfig = (value) => {
    localStorage.setItem(LOCAL_TOOLS_KEY, JSON.stringify(value))
  }

  const buildDefaultToolConfig = () => {
    const next = {}
    TOOL_DEFINITIONS.forEach((tool) => {
      next[tool.id] = true
    })
    return next
  }

  const ensureToolConfig = () => {
    const existing = getToolsConfig()
    if (existing) return existing
    const defaults = buildDefaultToolConfig()
    setToolsConfig(defaults)
    return defaults
  }

  const isConfigComplete = (config) => {
    return Boolean(config.provider && config.model && config.api_key && config.ocl_token && config.ocl_url)
  }

  const initChatPage = () => {
    const modal = document.querySelector('[data-modal="config"]')
    const form = document.querySelector('[data-form="config"]')
    const statusDot = document.querySelector('[data-status-dot]')
    const statusText = document.querySelector('[data-status-text]')
    const openBtn = document.querySelector('[data-open-config]')
    const closeBtn = document.querySelector('[data-close-config]')
    const toolSummary = document.querySelector('[data-tool-summary]')
    const log = document.querySelector('[data-chat-log]')
    const input = document.querySelector('[data-chat-input]')
    const sendBtn = document.querySelector('[data-chat-send]')
    const resetBtn = document.querySelector('[data-chat-reset]')
    const oclSelect = document.getElementById('ocl_url_select')
    const oclCustomField = document.querySelector('[data-ocl-custom-field]')
    const oclCustomInput = document.getElementById('ocl_url_custom')
    const navMenu = document.getElementById('nav-menu')
    const systemMsg = document.getElementById('system-setup-msg')
    const sessionAside = document.getElementById('session-controls-aside')
    const gridLayout = document.querySelector('.grid')
    const avatar = document.querySelector('[data-session-avatar]')
    const avatarInitial = document.querySelector('[data-avatar-initial]')
    const avatarMenu = document.querySelector('[data-session-menu]')

    let isLoading = false

    const setLoading = (loading) => {
      isLoading = loading
      if (sendBtn) {
        if (!sendBtn.dataset.defaultLabel) {
          sendBtn.dataset.defaultLabel = sendBtn.textContent || 'Send'
        }
        sendBtn.disabled = loading
        sendBtn.classList.toggle('is-loading', loading)
        sendBtn.setAttribute('aria-busy', loading ? 'true' : 'false')
        if (loading) {
          sendBtn.innerHTML = '<span class="linear-wipe">Analyzing...</span>'
        } else {
          sendBtn.textContent = sendBtn.dataset.defaultLabel || 'Send'
        }
      }
      if (input) {
        input.disabled = loading
      }
    }

    const updateUIForSession = (config) => {
      const ready = isConfigComplete(config)
      setStatus(ready)

      if (systemMsg) {
        systemMsg.style.display = ready ? 'none' : 'block'
      }

      if (sessionAside) {
        sessionAside.style.display = ready ? 'none' : 'grid'
      }
      
      if (gridLayout) {
        gridLayout.style.gridTemplateColumns = ready ? '1fr' : '2fr 1fr'
      }

      if (avatar) {
        if (ready && config.model) {
          avatarInitial.textContent = (config.model.trim().charAt(0) || '?').toUpperCase()
          avatar.title = config.model
          avatar.style.display = 'inline-flex'
        } else {
          avatar.style.display = 'none'
          if (avatarMenu) avatarMenu.classList.remove('open')
        }
      }
    }

    const setStatus = (ready) => {
      if (!statusDot || !statusText) return
      statusDot.classList.toggle('ready', ready)
      statusText.textContent = ready
        ? 'Configuration ready for this session.'
        : 'Missing session configuration.'
    }

    const openModal = () => {
      if (modal) modal.classList.add('open')
    }

    const closeModal = () => {
      if (modal) modal.classList.remove('open')
    }

    const defaults = readSessionDefaults()
    const currentConfig = getSessionConfig()
    setStatus(isConfigComplete(currentConfig))
    updateUIForSession(currentConfig)

    if (form) {
      form.provider.value = currentConfig.provider || defaults.provider || 'anthropic'
      form.model.value = currentConfig.model || defaults.model || 'claude-haiku-4-5'
      form.api_key.value = currentConfig.api_key || defaults.api_key || ''
      form.ocl_token.value = currentConfig.ocl_token || defaults.ocl_token || ''

      const oclValue = currentConfig.ocl_url || defaults.ocl_url || 'https://api.openconceptlab.org/'
      if (oclSelect) {
        const knownUrls = [
          'https://api.openconceptlab.org/',
          'http://api.openconceptlab.org/',
          'https://api.staging.openconceptlab.org/',
          'http://api.ocl.localhost'
        ]
        if (knownUrls.includes(oclValue) || oclValue === 'other') {
          oclSelect.value = oclValue
        } else {
          oclSelect.value = 'other'
          if (oclCustomInput) oclCustomInput.value = oclValue
        }
      }
    }

    if (!isConfigComplete(currentConfig)) {
      openModal()
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => openModal())
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal())
    }

    const toggleMenu = () => {
      if (!avatarMenu) return
      avatarMenu.classList.toggle('open')
    }

    const closeMenu = () => {
      if (avatarMenu) avatarMenu.classList.remove('open')
    }

    if (avatar) {
      avatar.addEventListener('click', (event) => {
        event.stopPropagation()
        toggleMenu()
      })
    }

    if (avatarMenu) {
      avatarMenu.addEventListener('click', (event) => event.stopPropagation())
      document.addEventListener('click', closeMenu)
      avatarMenu.querySelectorAll('[data-session-menu-action]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          const action = event.currentTarget.getAttribute('data-session-menu-action')
          if (action === 'logout') {
            sessionStorage.removeItem(SESSION_CONFIG_KEY)
            localStorage.removeItem(CHAT_HISTORY_KEY)
            updateUIForSession({})
            closeMenu()
            openModal()
          }
          if (action === 'config') {
            closeMenu()
            openModal()
          }
        })
      })
    }

    const toggleOclCustom = () => {
      if (!oclSelect || !oclCustomField) return
      const isOther = oclSelect.value === 'other'
      oclCustomField.style.display = isOther ? 'block' : 'none'
    }

    if (oclSelect) {
      toggleOclCustom()
      oclSelect.addEventListener('change', () => {
        toggleOclCustom()
      })
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        let oclUrlValue = 'https://api.openconceptlab.org/'
        if (oclSelect) {
          oclUrlValue = oclSelect.value
          if (oclUrlValue === 'other') {
            oclUrlValue = (oclCustomInput?.value || '').trim()
          }
        }
        const payload = {
          provider: form.provider.value.trim(),
          model: form.model.value.trim(),
          api_key: form.api_key.value.trim(),
          ocl_token: form.ocl_token.value.trim(),
          ocl_url: oclUrlValue
        }
        setSessionConfig(payload)
        setStatus(isConfigComplete(payload))
        updateUIForSession(payload)
        closeModal()
      })
    }

    const tools = ensureToolConfig()
    if (toolSummary) {
      const enabled = TOOL_DEFINITIONS.filter((tool) => tools[tool.id])
      toolSummary.textContent = `${enabled.length} of ${TOOL_DEFINITIONS.length} tools enabled in local settings.`
    }

    const coerceString = (value) => {
      if (typeof value === 'string') return value
      try {
        return JSON.stringify(value, null, 2)
      } catch (err) {
        return String(value)
      }
    }

    const formatMaybeJson = (value) => {
      const text = coerceString(value)
      try {
        const parsed = JSON.parse(text)
        return JSON.stringify(parsed, null, 2)
      } catch (err) {
        return text
      }
    }

    const renderMarkdown = (text) => {
      if (!text) return ''
      const raw = String(text)

      const escapeHtml = (value) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')

      if (window.marked && window.DOMPurify) {
        if (!window.__markedConfigured) {
          window.marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false })
          window.__markedConfigured = true
        }
        const html = window.marked.parse(raw)
        return window.DOMPurify.sanitize(html)
      }

      return escapeHtml(raw).replace(/\n/g, '<br />')
    }

    const addMessage = (role, text, persist = true) => {
      if (!log) return
      const entry = document.createElement('div')
      entry.className = `message ${role}`
      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.textContent = role === 'user' ? 'You' : 'Assistant'
      
      const body = document.createElement('div')
      body.className = 'markdown-body'
      body.innerHTML = renderMarkdown(coerceString(text))

      entry.appendChild(meta)
      entry.appendChild(body)

      log.appendChild(entry)
      log.scrollTop = log.scrollHeight

      if (persist) {
        const history = getChatHistory()
        history.push({ role, content: coerceString(text) })
        setChatHistory(history)
      }
    }

    const addToolEvent = (kind, toolName, payload, persist = true) => {
      if (!log) return
      const entry = document.createElement('div')
      entry.className = `message tool-${kind}`

      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.textContent = kind === 'call' ? 'Tool Call' : 'Tool Result'
      entry.appendChild(meta)

      const header = document.createElement('div')
      header.className = 'tool-event-header'
      const title = document.createElement('span')
      title.className = 'tool-event-name'
      title.textContent = toolName || 'Tool'
      const badge = document.createElement('span')
      badge.className = `tool-event-badge ${kind}`
      badge.textContent = kind === 'call' ? 'CALL' : 'RESULT'
      header.appendChild(title)
      header.appendChild(badge)
      entry.appendChild(header)

      const details = document.createElement('details')
      details.className = `tool-event-details ${kind}`
      const summary = document.createElement('summary')
      summary.className = 'tool-event-summary'
      summary.textContent = kind === 'call' ? 'View tool call' : 'View tool result'
      const pre = document.createElement('pre')
      pre.className = 'tool-event-pre'
      pre.textContent = formatMaybeJson(payload ?? {})
      details.appendChild(summary)
      details.appendChild(pre)
      entry.appendChild(details)

      log.appendChild(entry)
      log.scrollTop = log.scrollHeight

      if (persist) {
        const history = getChatHistory()
        history.push({ role: kind === 'call' ? 'tool_call' : 'tool_result', name: toolName, payload })
        setChatHistory(history)
      }
    }

    const addToolCalls = (toolCalls, persist = true) => {
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) return
      toolCalls.forEach((toolCall) => {
        addToolEvent('call', toolCall?.name, toolCall?.args ?? {}, persist)
        addToolEvent('result', toolCall?.name, toolCall?.result ?? '', persist)
      })
    }

    const buildHistoryPayload = () => {
      const history = getChatHistory()
      return history
        .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
        .map((entry) => ({ role: entry.role, content: String(entry.content || '') }))
    }

    const sendMessage = async () => {
      if (!input) return
      if (isLoading) return
      const value = input.value.trim()
      if (!value) return
      
      input.value = ''
      const historyPayload = buildHistoryPayload()
      addMessage('user', value)
      setLoading(true)

      try {
        const response = await fetch('/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: value, history: historyPayload })
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const data = await response.json()
        if (Array.isArray(data.events) && data.events.length) {
          data.events.forEach((event) => {
            if (event?.type === 'assistant') {
              addMessage('assistant', event.content || '')
            } else if (event?.type === 'tool_call') {
              addToolEvent('call', event.name, event.args ?? {})
            } else if (event?.type === 'tool_result') {
              addToolEvent('result', event.name, event.result ?? '')
            }
          })
        } else {
          if (data.content) addMessage('assistant', data.content)
          addToolCalls(data.tool_calls)
        }
      } catch (err) {
        console.error(err)
        addMessage('assistant', 'Error sending message. Please check the console.')
      } finally {
        setLoading(false)
      }
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage)
    }

    if (input) {
      input.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          sendMessage()
        }
      })
    }

    if (resetBtn && log) {
      resetBtn.addEventListener('click', () => {
        log.innerHTML = ''
        setChatHistory([])
      })
    }

    const history = getChatHistory()
    if (history.length) {
      history.forEach((entry) => {
        if (entry?.role === 'tool_call') {
          addToolEvent('call', entry.name, entry.payload ?? {}, false)
          return
        }
        if (entry?.role === 'tool_result') {
          addToolEvent('result', entry.name, entry.payload ?? '', false)
          return
        }
        if (entry?.role) {
          addMessage(entry.role, entry.content || '', false)
        }
      })
    }

    setLoading(false)
  }

  const initConfigPage = () => {
    const list = document.querySelector('[data-tool-list]')
    const counter = document.querySelector('[data-tool-count]')
    const resetBtn = document.querySelector('[data-reset-tools]')

    if (!list) return

    const state = ensureToolConfig()

    const updateCounter = () => {
      if (!counter) return
      const enabled = TOOL_DEFINITIONS.filter((tool) => state[tool.id])
      counter.textContent = `${enabled.length} of ${TOOL_DEFINITIONS.length} tools enabled.`
    }

    const render = () => {
      list.innerHTML = ''
      TOOL_DEFINITIONS.forEach((tool) => {
        const row = document.createElement('div')
        row.className = 'tool-item'

        const text = document.createElement('div')
        const title = document.createElement('h4')
        title.textContent = tool.name
        const desc = document.createElement('p')
        desc.textContent = tool.description
        text.appendChild(title)
        text.appendChild(desc)

        const toggle = document.createElement('label')
        toggle.className = 'toggle'
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = Boolean(state[tool.id])
        const slider = document.createElement('span')
        slider.className = 'slider'
        toggle.appendChild(input)
        toggle.appendChild(slider)

        input.addEventListener('change', () => {
          state[tool.id] = input.checked
          setToolsConfig(state)
          updateCounter()
        })

        row.appendChild(text)
        row.appendChild(toggle)
        list.appendChild(row)
      })
      updateCounter()
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = buildDefaultToolConfig()
        Object.keys(state).forEach((key) => delete state[key])
        Object.assign(state, defaults)
        setToolsConfig(state)
        render()
      })
    }

    render()
  }

  const page = document.body?.dataset?.page
  if (page === 'chat') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatPage)
    } else {
      initChatPage()
    }
  }
  if (page === 'config') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initConfigPage)
    } else {
      initConfigPage()
    }
  }
})()
