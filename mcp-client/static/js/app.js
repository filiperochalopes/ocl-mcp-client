(() => {
  const SESSION_CONFIG_KEY = 'ocl_mcp_config'
  const LOCAL_TOOLS_KEY = 'ocl_mcp_tools'

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

    if (form) {
      form.provider.value = currentConfig.provider || defaults.provider || 'anthropic'
      form.model.value = currentConfig.model || defaults.model || ''
      form.api_key.value = currentConfig.api_key || defaults.api_key || ''
      form.ocl_token.value = currentConfig.ocl_token || defaults.ocl_token || ''

      const oclValue = currentConfig.ocl_url || defaults.ocl_url || 'http://api.openconceptlab.org/'
      if (oclSelect) {
        const knownUrls = [
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
        let oclUrlValue = 'http://api.openconceptlab.org/'
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
        closeModal()
      })
    }

    const tools = ensureToolConfig()
    if (toolSummary) {
      const enabled = TOOL_DEFINITIONS.filter((tool) => tools[tool.id])
      toolSummary.textContent = `${enabled.length} of ${TOOL_DEFINITIONS.length} tools enabled in local settings.`
    }

    const addMessage = (role, text) => {
      if (!log) return
      const entry = document.createElement('div')
      entry.className = `message ${role}`
      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.textContent = role === 'user' ? 'You' : 'Assistant'
      const body = document.createElement('p')
      body.textContent = text
      entry.appendChild(meta)
      entry.appendChild(body)
      log.appendChild(entry)
      log.scrollTop = log.scrollHeight
    }

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => {
        const value = input.value.trim()
        if (!value) return
        addMessage('user', value)
        addMessage(
          'assistant',
          'This UI build stores messages locally. Connect it to the backend when ready to run live MCP calls.'
        )
        input.value = ''
      })
    }

    if (resetBtn && log) {
      resetBtn.addEventListener('click', () => {
        log.innerHTML = ''
      })
    }
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
    initChatPage()
  }
  if (page === 'config') {
    initConfigPage()
  }
})()
