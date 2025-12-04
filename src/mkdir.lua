local dirs = {
  "components/ui/__tests__",
  "components/screening/__tests__",
  "pages/__tests__",
  "hooks/__tests__",
  "services/__tests__",
  "test",
}

for _, d in ipairs(dirs) do
  vim.fn.mkdir(d, "p")
end

local setup = "test/setup.js"
if vim.fn.filereadable(setup) == 0 then
  local content = [[
import '@testing-library/jest-dom';
]]
  local f = io.open(setup, "w")
  if f then
    f:write(content)
    f:close()
  end
end

local roots = { "components", "pages", "hooks", "services" }
local function is_test_file(path)
  return path:match("__tests__") or path:match("%.test%.jsx$") or path:match("%.test%.js$") or path:match("%.spec%.jsx$") or
  path:match("%.spec%.js$")
end

local function to_test_path(src)
  local dir, file = src:match("^(.*)[/\\]([^/\\]+)$")
  if not dir or not file then return nil end
  local test_dir = dir .. "/__tests__"
  local base = file:gsub("%.jsx$", ""):gsub("%.js$", "")
  local ext = file:match("%.jsx$") and "jsx" or "js"
  return test_dir .. "/" .. base .. ".test." .. ext, test_dir
end

local function write_if_missing(path, content)
  if vim.fn.filereadable(path) == 1 then return end
  vim.fn.mkdir(vim.fn.fnamemodify(path, ":h"), "p")
  local f = io.open(path, "w")
  if f then
    f:write(content)
    f:close()
  end
end

local function stub_for(src)
  local name = src:match("([^/\\]+)%.jsx$") or src:match("([^/\\]+)%.js$") or "Component"
  return [[
import React from 'react';
import { render, screen } from '@testing-library/react';

describe(']] .. name .. [[', () => {
  test('renders without crashing', () => {
    // TODO: import and render component/module
    expect(true).toBe(true);
  });
});
]]
end

for _, root in ipairs(roots) do
  -- find all .js/.jsx excluding node_modules and __tests__
  local pattern_js = root .. "/**/*.js"
  local pattern_jsx = root .. "/**/*.jsx"
  local files = {}
  for _, p in ipairs(vim.fn.glob(pattern_js, true, true)) do table.insert(files, p) end
  for _, p in ipairs(vim.fn.glob(pattern_jsx, true, true)) do table.insert(files, p) end

  for _, src in ipairs(files) do
    if src ~= "" and not src:match("node_modules") and not is_test_file(src) then
      local test_path, test_dir = to_test_path(src)
      if test_path then
        vim.fn.mkdir(test_dir, "p")
        write_if_missing(test_path, stub_for(src))
      end
    end
  end
end
