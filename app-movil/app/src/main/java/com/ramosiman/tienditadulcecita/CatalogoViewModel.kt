package com.ramosiman.tienditadulcecita

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ramosiman.tienditadulcecita.data.Categoria
import com.ramosiman.tienditadulcecita.data.Producto
import com.ramosiman.tienditadulcecita.data.RetrofitClient
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.FlowPreview
import java.text.Normalizer

private fun String.sinTildes(): String =
    Normalizer.normalize(this, Normalizer.Form.NFD)
        .replace(Regex("[\\p{InCombiningDiacriticalMarks}]"), "")
        .lowercase()

sealed class CatalogoUiState {
    object Loading : CatalogoUiState()
    data class Success(val productos: List<Producto>) : CatalogoUiState()
    data class Error(val message: String) : CatalogoUiState()
}

@OptIn(FlowPreview::class)
class CatalogoViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<CatalogoUiState>(CatalogoUiState.Loading)
    val uiState: StateFlow<CatalogoUiState> = _uiState

    val searchQuery       = MutableStateFlow("")
    val soloConStock      = MutableStateFlow(false)
    val categorias        = MutableStateFlow<List<Categoria>>(emptyList())
    val activeCategoriaId = MutableStateFlow<Int?>(null)
    val currentPage       = MutableStateFlow(1)

    val pageSize = 30

    /* ── Debounced search — only fires 300 ms after user stops typing ── */
    private val searchDebounced: StateFlow<String> = searchQuery
        .debounce(300L)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")

    /* ── Derived reactive flows (computed in coroutine, cached) ── */

    val productosFiltrados: StateFlow<List<Producto>> = combine(
        _uiState, searchDebounced, soloConStock, activeCategoriaId
    ) { state, q, stock, catId ->
        val lista = if (state is CatalogoUiState.Success) state.productos else return@combine emptyList()
        var result = lista
        if (stock) result = result.filter { it.stock > 0 }
        if (q.trim().isNotEmpty()) {
            val query = q.trim().sinTildes()
            result = result.filter { it.nombre.sinTildes().contains(query) }
        }
        if (catId != null) result = result.filter { p -> p.categorias.any { it.id == catId } }
        result
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val totalPaginas: StateFlow<Int> = productosFiltrados.map { filtered ->
        maxOf(1, (filtered.size + pageSize - 1) / pageSize)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 1)

    val productosPagina: StateFlow<List<Producto>> = combine(
        productosFiltrados, currentPage
    ) { filtered, page ->
        filtered.drop((page - 1) * pageSize).take(pageSize)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        cargarProductos()
        cargarCategorias()
    }

    fun cargarProductos() {
        viewModelScope.launch {
            _uiState.value = CatalogoUiState.Loading
            try {
                val response = RetrofitClient.apiService.getProductos()
                val activos = response.data.filter { it.activo != 0 }
                _uiState.value = CatalogoUiState.Success(activos)
            } catch (e: Exception) {
                _uiState.value = CatalogoUiState.Error(e.message ?: "Error al conectar con el servidor")
            }
        }
    }

    fun cargarCategorias() {
        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getCategorias()
                categorias.value = response.data
            } catch (e: Exception) { /* silent */ }
        }
    }

    fun seleccionarCategoria(id: Int?) {
        activeCategoriaId.value = id
        currentPage.value = 1
    }

    fun irAPagina(page: Int) {
        currentPage.value = page
    }
}
