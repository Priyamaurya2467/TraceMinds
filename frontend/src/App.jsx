import { Activity,AlertTriangle, CheckCircle2, Clock3, Icon, RefreshCw, Search, Server, ShieldCheck, Zap } from 'lucide-react'

import React, { useEffect, useState } from 'react'
import { Area,AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
const API = "http://127.0.0.1:8000";

function MetricCard({title,value,subtitle,icon: Icon,color}){
  return (
    <div className='rounded-xl border border-slate-800 bg-slate-900/80 p-5'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-slate-400'>{title}</p>
        <Icon size={20} className={color}/>
      </div>
      <p className='mt-4 text-3xl font-semibold text-white'>{value}</p>
      <p className='mt-2 text-xs text-slate-500'>{subtitle}</p>
    </div>
  )
}
function App() {
    const [stats, setStats] = useState(null);
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);
  async function loadData() {
    try{
      setError("");
      const [statResponse , traceResponse] =await Promise.all([
        fetch(`${API}/api/stats`),
        fetch(`${API}/api/traces?limit=100`)
      ]);

      if (!statResponse.ok || !traceResponse.ok){
        throw new Error("The API returned an unsuccessful response.");
      }
      const statsData = await statResponse.json();
      const tracesData = await traceResponse.json();

      setStats(statsData);
      setTraces(tracesData.traces || []);
      
    }catch(err){
      setError(
        "Cannot connect to TraceMind API. Check that your backend is running."
      )
    }finally{
      setLoading(false)
    }
    
  }
  useEffect(()=>{
    loadData();
    const timer = setInterval(loadData,5000);
    return () => clearInterval(timer);
  },[]);

  const visibleTraces = traces.filter((trace) =>{
    const query = search.toLowerCase();

    const matchesSearch = 
        trace.path?.toLowerCase().includes(query) ||
        trace.trace_id?.toLowerCase().includes(query) ||
        trace.method?.toLowerCase().includes(query)
       
    

    const matchesFilter =
      filter === "all" ||
      (filter === "errors" && trace.status_code >= 400) ||
      (filter === "success" &&
          trace.status_code >= 200 && 
          trace.status_code < 400);
      return matchesSearch && matchesFilter;
  }
      );

    const chartData = [...traces]
      .slice(0,15)
      .reverse()
      .map((trace,index) => ({
        name: String(index+1),
        latency: trace.duration_ms,
      }));
  return (
    <div className='min-h-screen bg-[#090d18]'>
      <header className='border-b border-slate-800 bg-slate-950/90'>
        <div className='mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5'>
          <div className='flex items-center gap-3'>
            <Activity size = {25}/>
          </div>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-white'>TraceMind</h1>
            <p className='text-xs text-slate-500'>API observabilityr platform</p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <span className='flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400'>
            <span className='h-2 w-2 rounded-full bg-emerald-400'/>
            Monitoring
          </span>
          <button 
              onClick={loadData}
              className='rounded-lg border  border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800'
              title='Refresh data'
          >
            <RefreshCw size={17}/>
          </button>
        </div>
      </header>

      <main className='mx-auto max-w-[1500px] space-y-7 px-6 py-8'>
        <div>
          <p className='text-sm text-indigo-400'> OBSERVABILITY / OVERVIEW</p>
          <h2 className='mt-2 text-3xl font-bold text-white'>System Overview</h2>
          <p className='mt-2 text-sm text-slate-400'>Monitor requests, investigate errors, and track API performance.</p>
        </div>

        {
          error && (
            <div className='flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300'>
              <AlertTriangle size={20}/>
              {error}
            </div>
          )
        }

        {
          loading && !stats && !error && (
            <p className='text-sm text-slate-400'>Loading moinitoring data...</p>
          )
        }

        <section>
          <MetricCard 
              title="Total requests"
              value ={stats?.total_requests ?? "-"}  
              subtitle = "Requests captured in memory"
              icon={Activity}
              color = "text-indigo-400"
          />

          <MetricCard
              title="Successful requests"
              value ={stats?.successful_requests ?? "-"}  
              subtitle = "Requests below HTTP 400"
              icon={CheckCircle2}
              color = "text-emerald-400"
          />

          <MetricCard
              title="Failed requests"
              value ={stats?.failed_requests ?? "-"}  
              subtitle = {`${stats?.error_rate ?? 0}% error rate`}
              icon={AlertTriangle}
              color = "text-rose-400"
          />

          <MetricCard
              title="Average latency"
              value ={ stats ? `${stats.average_latency_ms} ms` : "—"}  
              subtitle = "Average response duration"
              icon={Zap}
              color = "text-amber-400"
          />
        </section>


        <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className='rounded-xl border border-slate-800 bg-slate-900/80 p-5'>

          
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-semibold text-white'>Request Latency</h3>
              <p className='mt-1 text-xs text-slate-500'>Recent Captured requests : milliseconds</p>
            </div>

            <Clock3 className='text-indigo-400' size={20}/>
            </div>

            <div className='mt-5 w-full' style={{height: 300}}>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id='latencyFill'
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop 
                          offset="95%"
                          stopColor='#818cf8'
                          stopOpacity={0}
                        />

                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke='#253047'
                      strokeDasharray="3 3"
                      vertical={false}

                    />
                    <XAxis
                      dataKey="name"
                      stroke='#64748b'
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke='#64748b'
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid #334155",
                        borderRadius:10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      name="Latency (ms)"
                      stroke="#818cf8"
                      fill="url(#latencyFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>

                </ResponsiveContainer>  
              ):(
                <div className='flex h-full items-center justify-center text-sm text-slate-500'>
                  Make a few API requests to populate the chart.
                </div>
              )
              }
            </div>
          </div>


          <div className='rounded-xl border border-slate-800 bg-slate-900/80 p-5'>
            <h3 className='font-semibold text-white'>Service health</h3>
            <p className='mt-1 text-xs text-slate-500'>
              Monitoring API response activity
            </p>


            <div className='mt-6 space-y-4'>
              <div className='flex items-center gap-3 rounded-lg bg-slate-800/60 p-4'>
                <Server className='text-indigo-400' size={21}/>

                <div className='flex-1'>
                  <p className='text-sm text-white'>TraceMind API</p>
                  <p className='mt-1 text-xs text-slate-500'></p>
                </div>
                <span className='text-xs text-emerald-400'>Connected</span>
              </div>


              <div className='flex items-center gap-3 rounded-lg bg-slate-800/60 p-4'>
                <ShieldCheck className='text-emerald-400' size={21}/>
                <div className='flex-1'>
                  <p className='text-sm text-white'>Request Tracing</p>
                  <p className='mt-1 text-xs text-slate-500'>Recent requests in memory</p>
                </div>
                <span className='text-xs text-emerald-400'>Enabled</span>
              </div>

              <div className='rounded-lg border border-slate-800 p-4'>
                <p className='text-xs text-slate-500'>Captured requests</p>
                <p className='mt-2 text-2xl font-semibold text-white'>{traces.length}</p>
                <p className='mt-1 text-xs text-slate-500'>Refreshes automatically every 5 seconds</p>
              </div>
            </div>
          </div>
        </section>

        <section className='overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80'>
          <div className='flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h3 className='font-semibold text-white'>Trace explorer</h3>
              <p className='mt-1 text-xs text-slate-500'>Inspect captured API requests</p>
            </div>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <div className='flex items-center gap-2 rounded-lg border border-slate-700 px-3'>
                <Search size={16} className='text-slate-500'/>
                <input 
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  placeholder='Search path, method, trace ID...'
                  className='w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500 sm:w-64'
                />
              </div>

              <select value={filter} onChange={(e)=>setFilter(e.target.value)} className='rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none'>

                <option value="all"> All requests</option>
                <option value="success">Successful</option>
                <option value="errors">Errors</option>

              </select>
            </div>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-5 py-4'>Trace ID</th>
                  <th className='px-5 py-4'>Method / Endpoint</th>
                  <th className='px-5 py-4'>Status</th>
                  <th className='px-5 py-4'>Latency</th>
                  <th className='px-5 py-4'>Timestamp</th>
                  
                </tr>
              </thead>

              <tbody className='divide-y divide-sla'>
                {visibleTraces.map((trace) => (
                  <tr
                    key={trace.trace_id}
                    onClick={()=>setSelected(trace)}
                    className='cursor-pointer hover:bg-slate-800/50'
                    >

                      <td className='whitespace-nowrap px-5 py-4 font-mono text-xs text-indigo-300'>{trace.trace_id?.slice(0,8)}...</td>
                      <td className='px-5 py-4'>
                        <span className='mr-2 text-xs font-semibold text-slate-300'>{trace.method}</span>
                        <span className='text-slate-400'>{trace.path}</span>
                      </td>

                      <td className='px-5 py-4'>
                        <span className={`rounded-md px-2 py-1 text-xs ${trace.status_code >= 400 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>{trace.status_code}</span>
                      </td>

                      <td className='whitespace-nowrap px-5 py-4 text-slate-300'>
                        {trace.duration_ms}ms
                      </td>

                      <td>
                        {trace.timestamp
                          ? new Date(trace.timestamp).toLocaleTimeString()
                          :"-"
                        }
                      </td>

                  </tr>
                ))}

                {!visibleTraces.length && (
                  <tr>
                    <td
                      colSpan="5"
                      className='px-5 py-12 text-center text-slate-500'
                    >
                      No matching traces. Try a test endpoint or change filters.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          <div className='border-t border-slate-800 px-5 py-3 text-xs text-slate-500'>
            Showing {visibleTraces.length} of {traces.length} loaded traces
          </div>
        </section>

        {selected && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4' onClick={()=>setSelected(null)}>
            <div className='w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6' onClick={(e)=>e.stopPropagation()}>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-white'>Trace details</h3>
                <button onClick={()=>setSelected(null)} className='text-slate-400 hover:text-white'>Close</button>
              </div>
              <dl>
                {Object.entries(selected).map(([key,value])=>(
                  <div key={key} className='grid grid-cols-[130px_1fr] gap-3 border-b border-slate-800 pb-3'>
                    <dt className='text-slate-500'>{key}</dt>
                    <dd className='break-all text-slate-200'>
                      {value === null ? "None" : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>

              <button className='mt-5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400' onClick={()=>{navigator.clipboard.writeText(selected.trace_id)}}>
                Copy trace ID
              </button>
            </div>
          </div>
        )}
        <footer className='pb-5 text-center text-xs text-slate-600'>
          TraceMind · API observability · Local development
        </footer>
      </main>
    </div>
  )
}

export default App