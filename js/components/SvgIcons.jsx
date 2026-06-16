const SVGIcon = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 opacity-75">
      <path d="M11.47 3.82a.75.75 0 011.06 0l8.69 8.69a.75.75 0 11-1.06 1.06l-.968-.968V19.5a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75V14h-3v5.5a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75V12.632l-.968.968a.75.75 0 01-1.06-1.06l8.69-8.69z" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  All: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-3.5 h-3.5 opacity-75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  User: ({ className = "w-3 h-3" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 17a6 6 0 1112 0H6z" />
    </svg>
  ),
  Users: ({ className = "w-3 h-3" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.176A6.963 6.963 0 017 18a6.963 6.963 0 01-5.385-1.572zM14.5 11c-.983 0-1.874.35-2.57.925A4.002 4.002 0 0118 16v.25H22v-.25a4.002 4.002 0 00-7.5-2.675z" />
    </svg>
  ),
  Calendar: ({ className = "w-3 h-3" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
    </svg>
  ),
  Status: ({ className = "w-3 h-3", dotClass = "text-zinc-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} ${dotClass}`}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM10 13a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  Flag: ({ className = "w-3 h-3" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75zM6 3.75A.75.75 0 016.75 3h7.5a.75.75 0 01.53 1.28l-2.22 2.22a.75.75 0 000 1.06l2.22 2.22a.75.75 0 01-.53 1.28h-7.5A.75.75 0 016 16.25V3.75z" />
    </svg>
  ),
  ChevronRight: ({ className = "w-3 h-3" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  ),
  Link: ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M12.232 4.232a2.5 2.5 0 015.658 3.658l-2.25 2.25a2.5 2.5 0 01-3.536 0 .75.75 0 00-1.06 1.06 4 4 0 005.656 0l2.25-2.25a4 4 0 00-5.656-5.656l-1.1 1.1a.75.75 0 101.06 1.06l1.1-1.1z" />
      <path d="M7.768 15.768a2.5 2.5 0 01-3.658-5.658l2.25-2.25a2.5 2.5 0 013.536 0 .75.75 0 001.06-1.06 4 4 0 00-5.656 0l-2.25 2.25a4 4 0 105.656 5.656l1.1-1.1a.75.75 0 10-1.06-1.06l-1.1 1.1z" />
    </svg>
  )
};

// =========================================================================
// 📅 COMPONENTE: CALENDARIO MENSUAL INTEGRADO (NOTION CALENDAR VIEW - FULL WIDTH)
// =========================================================================
